#!/usr/bin/env python3
"""
premarket_scan.py — Market Vibrations daily Sweep -> FVG radar (equities)

Pulls 1-minute bars from Massive, computes the four liquidity pools
(PDH/PDL/PMH/PML), detects the first killzone sweep + displacement FVG per
ticker, and writes scan.json (consumed by SweepRadarCard.jsx) plus a text brief.

Data sources:
  --source flatfiles   Massive S3 flat files (T+1; great for EOD review / backtest)
  --source rest        Massive REST aggregates (latency depends on your plan)

Credentials (env vars):
  MASSIVE_API_KEY      REST key  AND  the S3 secret (Massive uses the API key as
                       the flat-files secret key)
  MASSIVE_S3_KEY_ID    S3 Access Key ID (UUID) for flat files

This is an INFORMATIONAL radar. The v0 mechanical rule did not show a tradeable
edge in backtest (see SweepFVG_Backtest_Report.md). Do not auto-trade it.
"""
import os, sys, csv, io, gzip, json, argparse, datetime, urllib.request, urllib.parse

WATCHLIST = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "AMD"]
APIKEY = os.environ.get("MASSIVE_API_KEY", "")
S3ID   = os.environ.get("MASSIVE_S3_KEY_ID", "")

U = lambda ns: datetime.datetime.utcfromtimestamp(int(ns) / 1e9)

# ---------- model (mirrors the backtested engine) ----------
def _seg(bars, d, h0, m0, h1, m1):
    a = datetime.datetime(d.year, d.month, d.day, h0, m0)
    b = datetime.datetime(d.year, d.month, d.day, h1, m1)
    return [x for x in bars if a <= U(x[0]) < b]

def detect(prev_bars, cur_bars, day, ticker, buf_pct=0.0005):
    d = datetime.datetime.strptime(day, "%Y-%m-%d")
    pd_ = _seg(prev_bars, d - datetime.timedelta(days=1), 13, 30, 20, 0) or _seg(prev_bars, d, 13, 30, 20, 0)
    pm  = _seg(cur_bars, d, 8, 0, 13, 30)
    if not pd_ or not pm:
        return {"ticker": ticker, "setup": "no_pools"}
    PDH, PDL = max(x[2] for x in pd_), min(x[3] for x in pd_)
    PMH, PML = max(x[2] for x in pm), min(x[3] for x in pm)
    pools = {"PDH": round(PDH, 2), "PDL": round(PDL, 2), "PMH": round(PMH, 2), "PML": round(PML, 2)}
    kz  = _seg(cur_bars, d, 13, 30, 15, 0)
    rth = _seg(cur_bars, d, 13, 30, 20, 0)
    if len(kz) < 3:
        return {"ticker": ticker, "setup": "insufficient_bars", "pools": pools}
    ev = None
    for b in kz:
        for nm, lv in sorted([("PDH", PDH), ("PMH", PMH)], key=lambda x: x[1]):
            if b[2] > lv and b[4] < lv: ev = ("short", nm, lv, b); break
        if ev: break
        for nm, lv in sorted([("PDL", PDL), ("PML", PML)], key=lambda x: -x[1]):
            if b[3] < lv and b[4] > lv: ev = ("long", nm, lv, b); break
        if ev: break
    if not ev:
        return {"ticker": ticker, "setup": "no_sweep", "pools": pools}
    side, pool, lvl, swept = ev
    seq = rth[rth.index(swept):]
    fvg = None
    for j in range(1, min(len(seq) - 1, 13)):
        a, c = seq[j - 1], seq[j + 1]
        if side == "short" and c[2] < a[3]: fvg = (a[3], c[2]); break
        if side == "long"  and c[3] > a[2]: fvg = (c[3], a[2]); break
    if not fvg:
        return {"ticker": ticker, "setup": "sweep_no_fvg", "side": side, "pool": pool, "pools": pools}
    top, bot = fvg; entry = (top + bot) / 2; buf = entry * buf_pct
    if side == "short":
        stop = swept[2] + buf; risk = stop - entry
        cand = [v for v in (PDL, PML) if v < entry]; target = max(cand) if cand else None
    else:
        stop = swept[3] - buf; risk = entry - stop
        cand = [v for v in (PDH, PMH) if v > entry]; target = min(cand) if cand else None
    if risk <= 0 or target is None:
        return {"ticker": ticker, "setup": "no_target", "side": side, "pool": pool, "pools": pools}
    rr = abs(target - entry) / risk
    if rr < 1:
        return {"ticker": ticker, "setup": "target_lt_1R", "side": side, "pool": pool, "rr": round(rr, 2), "pools": pools}
    return {"ticker": ticker, "setup": "signal", "side": side, "pool": pool,
            "sweptLevel": round(lvl, 2), "entry": round(entry, 2), "stop": round(stop, 2),
            "target": round(target, 2), "rr": round(rr, 2),
            "sweptAt": U(swept[0]).strftime("%H:%MZ"), "pools": pools}

# ---------- data loaders ----------
def load_flatfiles(day):
    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url="https://files.massive.com",
                      aws_access_key_id=S3ID, aws_secret_access_key=APIKEY,
                      config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
                      region_name="us-east-1")
    key = f"us_stocks_sip/minute_aggs_v1/{day[:4]}/{day[5:7]}/{day}.csv.gz"
    raw = gzip.decompress(s3.get_object(Bucket="flatfiles", Key=key)["Body"].read()).decode()
    out = {t: [] for t in WATCHLIST}
    pref = tuple(t + "," for t in WATCHLIST)
    for ln in raw.splitlines():
        if ln.startswith(pref):
            f = ln.split(",")  # ticker,vol,open,close,high,low,window_start,txns
            out[f[0]].append((int(f[6]), float(f[2]), float(f[4]), float(f[5]), float(f[3])))
    for t in out: out[t].sort()
    return out

def load_rest(ticker, day):  # NOTE: stocks REST symbology = plain ticker
    base = f"https://api.massive.com/stocks/v1/aggs/{ticker}"
    D = datetime.datetime
    d = D.strptime(day, "%Y-%m-%d")
    lo = int(d.replace(tzinfo=datetime.timezone.utc).timestamp() * 1e9)
    hi = int((d + datetime.timedelta(days=1)).replace(tzinfo=datetime.timezone.utc).timestamp() * 1e9)
    q = urllib.parse.urlencode({"resolution": "1min", "limit": 50000,
                                "window_start.gte": lo, "window_start.lt": hi, "sort": "window_start.asc"})
    req = urllib.request.Request(base + "?" + q, headers={"Authorization": "Bearer " + APIKEY})
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.load(r).get("results", [])
    return [(x["window_start"], x["open"], x["high"], x["low"], x["close"]) for x in res]

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["flatfiles", "rest"], default="flatfiles")
    ap.add_argument("--day", default=None, help="YYYY-MM-DD (default: today UTC)")
    ap.add_argument("--prev", default=None, help="prior trading day YYYY-MM-DD")
    ap.add_argument("--out", default="scan.json")
    a = ap.parse_args()
    day = a.day or datetime.datetime.utcnow().strftime("%Y-%m-%d")
    prev = a.prev or (datetime.datetime.strptime(day, "%Y-%m-%d") - datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    scan = []
    if a.source == "flatfiles":
        dp, dc = load_flatfiles(prev), load_flatfiles(day)
        for t in WATCHLIST:
            scan.append(detect(dp[t], dc[t], day, t))
    else:
        for t in WATCHLIST:
            scan.append(detect(load_rest(t, prev), load_rest(t, day), day, t))

    json.dump({"day": day, "asOf": a.source, "scan": scan}, open(a.out, "w"), indent=2)
    print(f"[{day}] wrote {a.out}")
    for s in scan:
        if s["setup"] == "signal":
            print(f"  {s['ticker']:5} {s['side'].upper():5} swept {s['pool']} @ {s['sweptLevel']} | "
                  f"entry {s['entry']} stop {s['stop']} target {s['target']} ({s['rr']}R)  [informational]")
        else:
            print(f"  {s['ticker']:5} {s['setup']}")

if __name__ == "__main__":
    if not APIKEY:
        sys.exit("Set MASSIVE_API_KEY (and MASSIVE_S3_KEY_ID for flat files).")
    main()

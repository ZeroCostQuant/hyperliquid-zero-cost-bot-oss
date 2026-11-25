---
name: crypto-strategy-stress-test
description: Rigorously stress-test any systematic crypto trading idea against realistic fees, out-of-sample splits, parameter perturbation, cross-asset decay, daily VaR(95%), Payoff Ratio (p), and 20 random monkeys before risking real capital.
---

# Crypto Strategy Stress-Test Skill (ZeroCostQuant Edition)

Use this skill whenever a user asks to evaluate, backtest, or verify a systematic crypto trading strategy (e.g., breakout, RSI mean reversion, martingale/averaging-down, cointegration pair trading, or LLM-generated rules).

> **Disclaimer:** Engineering and historical research workflow only. Never output financial advice, trade recommendations, or guaranteed return claims.

## Mandatory 5-Gate Stress-Test Protocol

When testing any candidate rule, enforce **all 5 gates** in order. Never skip a gate and never report only the best-looking period.

### Gate 1: Strict Out-of-Sample (OOS) Split & Zero Lookahead
- Use at least 3–5 years of daily OHLCV data (e.g., BTC, ETH, SOL).
- Split chronologically into **In-Sample (IS)** and **Out-of-Sample (OOS, ≥ 2 years)**.
- Execute position changes strictly on the *next* bar (previous day's confirmed position earns today's return). Never peek at future candles.

### Gate 2: Realistic Turnover Costs & 2x Fee Stress
- Deduct at least **0.15% per one-way turnover** (`0.10%` fee + `0.05%` slippage) on every position change.
- Re-run with **2x costs (0.30% one-way)**. If OOS Sharpe collapses under 2x fees, flag as fragile.

### Gate 3: Parameter Stability (±20%) & Cross-Asset Transfer
- Shift primary lookback windows by **-20% and +20%**. Report if OOS Sharpe degrades sharply.
- Run the exact same rule unmodified on **at least 2 other liquid assets** (e.g., ETH and SOL) to expose single-asset overfitting.

### Gate 4: Random Monkey Benchmark (20 Monkeys) + Payoff Ratio (`p`) + Daily VaR(95%)
- Simulate **20 random traders** over the identical OOS window with the same fee model. Report how many monkeys the strategy beats (e.g., `18 / 20`).
- Compute and report:
  - **Win Rate**, **Avg Win %**, **Avg Loss %**, and **Payoff Ratio (`p = Avg Win / |Avg Loss|`)**
  - **Profit Factor** and **OOS Max Drawdown** (plus **IS Max Drawdown** so worst-case risk is never hidden)
  - **Daily VaR (95%)** (5th percentile daily return)

### Gate 5: Verdict & Forward-Test Rule
Assign one honest verdict:
- `FAILED`: Negative OOS return, severe drawdown (> 40% OOS), or beaten by median random monkeys. (Flag martingale/averaging-down blowups explicitly.)
- `DECAYED`: Strong IS Sharpe but collapsed OOS Sharpe.
- `PAPER_CANDIDATE`: Positive OOS return, Sharpe ≥ 0.6, beats ≥ 75% of monkeys, and survives 2x fees — **still requires ≥ 30 days of forward paper-trading logs (e.g., on $0/month Cloudflare Workers + D1) before considering Testnet or small-capital live deployment.**

## Output Format
Always present a compact Markdown table comparing **IS Return, OOS Return, OOS Sharpe, IS/OOS Max DD, Payoff Ratio (`p`), Daily VaR(95%), and Monkey Rank**, followed by an explicit **"Honest Limitations"** section listing every weakness found.

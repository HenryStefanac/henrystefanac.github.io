(function () {
  if (!window.Chart) return;

  var C = {
    text: '#9aa3b0', grid: '#262c36', zero: '#4a5261',
    line: '#7aa7ff', fit: '#c9ced6',
    blownLine: 'rgba(154, 163, 176, 0.38)', alive: '#7aa7ff',
    payout: '#f2b544', payoutEdge: '#8a5a0b', blown: '#ef5b5b', blownEdge: '#7f1d1d',
    tipBg: '#242a34', tipLine: '#3a4250'
  };

  Chart.defaults.color = C.text;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;

  var money = function (v) {
    var s = Math.abs(v) >= 1000 ? '$' + (Math.abs(v) / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + Math.round(Math.abs(v));
    return (v < 0 ? '−' : '') + s;
  };
  var exact = function (v) {
    return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  var tooltip = {
    backgroundColor: C.tipBg, borderColor: C.tipLine, borderWidth: 1,
    titleColor: '#e6e9ee', bodyColor: '#c9ced6', padding: 10, displayColors: false
  };

  function axes(xTitle, yTitle) {
    return {
      x: { type: 'linear', title: { display: true, text: xTitle }, grid: { color: C.grid }, border: { color: C.grid } },
      y: {
        title: { display: true, text: yTitle },
        grid: { color: function (c) { return c.tick.value === 0 ? C.zero : C.grid; } },
        border: { color: C.grid },
        ticks: { callback: money }
      }
    };
  }

  fetch('/assets/data/apex-run1.json').then(function (r) { return r.json(); }).then(function (d) {
    contractsChart(d);
    accountsChart(d);
  });

  modelVsActual();

  function modelVsActual() {
    var M = {
      gross: { model: [21686, 15007], actual: [20417, 12000] },
      runs: [
        { name: 'Run 1', n: 29, model: [81.8, 9.7, 4.0, 4.5], actual: [20, 5, 3, 1] },
        { name: 'Run 2', n: 20, model: [79.1, 9.6, 4.6, 6.7], actual: [14, 6, 0, 0] }
      ]
    };
    var MODEL = '#8b95a5', ACTUAL = '#7aa7ff';
    var BUCKETS = ['0 payouts', '1 payout', '2 payouts', '3+ payouts'];
    var SEQ = ['#3a4250', '#3d6bb3', '#6f9ef2', '#b8d0ff'];
    var SEQ_TEXT = ['#c9ced6', '#e6e9ee', '#0f1420', '#0f1420'];

    var barLabels = {
      id: 'barLabels',
      afterDatasetsDraw: function (chart, args, opts) {
        var ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 12px ' + Chart.defaults.font.family;
        ctx.textAlign = 'center';
        chart.data.datasets.forEach(function (ds, di) {
          chart.getDatasetMeta(di).data.forEach(function (bar, i) {
            var v = ds.data[i];
            if (opts.stacked) {
              var w = Math.abs(bar.x - bar.base);
              if (w < 38 || !v) return;
              ctx.fillStyle = SEQ_TEXT[di];
              ctx.textBaseline = 'middle';
              ctx.fillText(Math.round(v) + '%', (bar.x + bar.base) / 2, bar.y);
            } else {
              ctx.fillStyle = '#c9ced6';
              ctx.textBaseline = 'bottom';
              ctx.fillText(money(v), bar.x, bar.y - 6);
            }
          });
        });
        ctx.restore();
      }
    };

    var elA = document.getElementById('chart-pva-payouts');
    if (elA) new Chart(elA, {
      type: 'bar',
      data: {
        labels: M.runs.map(function (r) { return r.name; }),
        datasets: [
          { label: 'Model (expected)', data: M.gross.model, backgroundColor: MODEL, borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 64 },
          { label: 'Actual', data: M.gross.actual, backgroundColor: ACTUAL, borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 64 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: 22 } },
        datasets: { bar: { categoryPercentage: 0.6, barPercentage: 0.9 } },
        scales: {
          x: { grid: { display: false }, border: { color: C.grid } },
          y: { beginAtZero: true, grid: { color: C.grid }, border: { display: false }, ticks: { callback: money } }
        },
        plugins: {
          legend: { display: false },
          barLabels: { stacked: false },
          tooltip: Object.assign({}, tooltip, {
            callbacks: {
              title: function (i) { return i[0].label; },
              label: function (i) { return i.dataset.label + ': ' + exact(i.parsed.y); },
              afterBody: function (i) {
                var k = i[0].dataIndex, m = M.gross.model[k], a = M.gross.actual[k];
                return 'Actual was ' + Math.round(a / m * 100) + '% of expected';
              }
            }
          })
        }
      },
      plugins: [barLabels]
    });

    var elB = document.getElementById('chart-pva-dist');
    if (elB) {
      var rows = [], meta = [];
      M.runs.forEach(function (r) {
        rows.push(r.name + ' model'); meta.push({ run: r, kind: 'model' });
        rows.push(r.name + ' actual'); meta.push({ run: r, kind: 'actual' });
      });
      var pct = function (m, b) {
        return m.kind === 'model' ? m.run.model[b] : m.run.actual[b] / m.run.n * 100;
      };
      new Chart(elB, {
        type: 'bar',
        data: {
          labels: rows,
          datasets: BUCKETS.map(function (name, b) {
            return {
              label: name, data: meta.map(function (m) { return Math.round(pct(m, b) * 10) / 10; }),
              backgroundColor: SEQ[b], borderColor: '#1d222a', borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 34
            };
          })
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
          datasets: { bar: { categoryPercentage: 0.8, barPercentage: 0.9 } },
          scales: {
            x: { stacked: true, min: 0, max: 100, grid: { color: C.grid }, border: { display: false }, ticks: { callback: function (v) { return v + '%'; } } },
            y: {
              stacked: true, grid: { display: false }, border: { color: C.grid },
              ticks: { color: function (c) { return /actual/.test(rows[c.index]) ? '#e6e9ee' : C.text; } }
            }
          },
          plugins: {
            legend: { display: false },
            barLabels: { stacked: true },
            tooltip: Object.assign({}, tooltip, {
              callbacks: {
                title: function (i) { return i[0].label; },
                label: function (i) {
                  var m = meta[i.dataIndex], b = i.datasetIndex;
                  var count = m.kind === 'model'
                    ? (m.run.model[b] / 100 * m.run.n).toFixed(1) + ' of ' + m.run.n + ' accounts expected'
                    : m.run.actual[b] + ' of ' + m.run.n + ' accounts';
                  return BUCKETS[b] + ': ' + i.parsed.x + '% (' + count + ')';
                }
              }
            })
          }
        },
        plugins: [barLabels]
      });
    }
  }

  function contractsChart(d) {
    var el = document.getElementById('chart-contracts');
    if (!el) return;
    var net = [{ x: 0, y: 0 }].concat(d.contracts.map(function (y, i) { return { x: i + 1, y: y }; }));
    var gross = [{ x: 0, y: 0 }].concat(d.contracts.map(function (y, i) { return { x: i + 1, y: Math.round((y + d.commission * (i + 1)) * 100) / 100 }; }));
    var pts = net;
    var withComm = true;
    var n = d.contracts.length;
    var chart = new Chart(el, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Cumulative P&L', data: pts, borderColor: C.line, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: C.line, tension: 0 },
          { label: '0 EV', data: [{ x: 0, y: 0 }, { x: n, y: -d.commission * n }], borderColor: C.fit, borderWidth: 1.5, borderDash: [4, 5], pointRadius: 0, pointHoverRadius: 0, tension: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', axis: 'x', intersect: false },
        scales: axes('Contract', 'P&L'),
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltip, {
            filter: function (i) { return i.datasetIndex === 0; },
            callbacks: {
              title: function (i) { return 'Contract ' + i[0].parsed.x.toLocaleString(); },
              label: function (i) {
                if (!withComm) return 'Gross P&L ' + exact(i.parsed.y);
                return ['Net P&L ' + exact(i.parsed.y), '0 EV line ' + exact(-d.commission * i.parsed.x)];
              }
            }
          })
        }
      }
    });

    var sw = document.getElementById('toggle-commissions');
    var fitKey = document.querySelector('.legend-fit');
    if (sw) sw.addEventListener('click', function () {
      withComm = !withComm;
      sw.setAttribute('aria-checked', String(withComm));
      chart.data.datasets[0].data = withComm ? net : gross;
      chart.data.datasets[1].hidden = !withComm;
      if (fitKey) fitKey.hidden = !withComm;
      chart.update('none');
    });
  }

  function accountsChart(d) {
    var el = document.getElementById('chart-accounts');
    if (!el) return;
    var accts = d.accounts;
    var baseColor = function (a) { return a.blown ? C.blownLine : C.alive; };
    var ds = accts.map(function (a) {
      return {
        label: a.label, kind: 'acct', order: a.blown ? 2 : 1,
        data: a.points.map(function (p) { return { x: p[0], y: p[1] }; }),
        borderColor: baseColor(a), borderWidth: a.blown ? 1.5 : 2.25,
        pointRadius: 0, pointHoverRadius: 0, tension: 0
      };
    });
    var payouts = [], blowups = [];
    accts.forEach(function (a) {
      (a.payouts || []).forEach(function (p) { payouts.push({ x: p.x, y: p.before, acct: a.label, amount: p.amount, after: p.after, date: p.date }); });
      if (a.blown) { var last = a.points[a.points.length - 1]; blowups.push({ x: last[0], y: last[1], acct: a.label }); }
    });
    ds.push({ label: 'Payouts', kind: 'payout', order: 0, data: payouts, showLine: false, pointStyle: 'rectRot', pointRadius: 6, pointHoverRadius: 8, backgroundColor: C.payout, borderColor: C.payoutEdge, borderWidth: 1.5 });
    ds.push({ label: 'Blown', kind: 'blown', order: 0, data: blowups, showLine: false, pointStyle: 'circle', pointRadius: 4.5, pointHoverRadius: 6.5, backgroundColor: C.blown, borderColor: C.blownEdge, borderWidth: 1.5 });

    var hot = -1;
    var chart = new Chart(el, {
      type: 'line',
      data: { datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'nearest', axis: 'xy', intersect: true },
        elements: { point: { hitRadius: 10 }, line: { borderCapStyle: 'round' } },
        scales: axes('Contract number (per account)', 'P&L'),
        onHover: function (e, items) {
          var idx = -1;
          if (items.length) {
            var it = items[0], dsx = chart.data.datasets[it.datasetIndex];
            if (dsx.kind === 'acct') idx = it.datasetIndex;
            else { var name = dsx.data[it.index].acct; idx = accts.findIndex(function (a) { return a.label === name; }); }
          }
          if (idx === hot) return;
          hot = idx;
          accts.forEach(function (a, i) {
            var s = chart.data.datasets[i];
            s.borderColor = i === hot ? (a.blown ? '#e6e9ee' : '#b3ccff') : baseColor(a);
            s.borderWidth = i === hot ? 3 : (a.blown ? 1.5 : 2.25);
          });
          chart.update('none');
        },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltip, {
            callbacks: {
              title: function (i) {
                var r = i[0].raw, dsx = i[0].dataset;
                return (dsx.kind === 'acct' ? dsx.label : r.acct) + ' · contract ' + r.x;
              },
              label: function (i) {
                var r = i.raw, k = i.dataset.kind;
                if (k === 'payout') return ['Payout ' + exact(r.amount) + ' (requested ' + r.date + ')', 'P&L ' + exact(r.y) + ' → ' + exact(r.after)];
                if (k === 'blown') return 'Blown at ' + exact(r.y);
                return 'P&L ' + exact(r.y);
              }
            }
          })
        }
      }
    });
    el.addEventListener('mouseleave', function () { chart.options.onHover(null, []); });
  }
})();

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Path, Polygon, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { apiService } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function InteractiveChart({ candles = [], activeInterval = '1m', onIntervalChange, minimalMode = false, activeTrades = [] }) {
  const { theme, settings } = useApp();
  const [chartType, setChartType] = useState(settings?.defaultChartMode || 'candle'); // 'candle' | 'line'
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  
  // Interactive hover tracking state
  const [hoverIndex, setHoverIndex] = useState(null);

  // Timeframe Panning and Fluctuation States
  const [panOffset, setPanOffset] = useState(0);
  const [isMarketLive, setIsMarketLive] = useState(true);
  const [togglingLive, setTogglingLive] = useState(false);

  // Synchronize with global settings layout mode
  useEffect(() => {
    if (minimalMode) {
      setChartType('line');
      setShowEMA9(false);
      setShowEMA21(false);
      setShowBB(false);
      setShowRSI(false);
      setShowMACD(false);
    } else if (settings?.defaultChartMode) {
      setChartType(settings.defaultChartMode);
    }
  }, [settings?.defaultChartMode, minimalMode]);

  // Synchronize simulator status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiService.getSimulatorStatus();
        setIsMarketLive(res.is_fluctuating);
      } catch (err) {
        console.error('Failed to fetch simulator status:', err);
      }
    };
    fetchStatus();
  }, []);

  const handleToggleLive = async () => {
    if (togglingLive) return;
    setTogglingLive(true);
    try {
      const targetState = !isMarketLive;
      const res = await apiService.toggleSimulatorFluctuations(targetState);
      setIsMarketLive(res.is_fluctuating);
    } catch (err) {
      console.error('Failed to toggle simulator fluctuations:', err);
    } finally {
      setTogglingLive(false);
    }
  };

  const handlePanBack = () => {
    setPanOffset((prev) => {
      const maxOffset = Math.max(0, candles.length - 60);
      return Math.min(maxOffset, prev + 10);
    });
  };

  const handlePanFwd = () => {
    setPanOffset((prev) => Math.max(0, prev - 10));
  };

  const handlePanLive = () => {
    setPanOffset(0);
  };

  // Reset panning offset when interval or symbols change
  useEffect(() => {
    setPanOffset(0);
  }, [candles.length, activeInterval]);

  const { width: screenWidth } = useWindowDimensions();
  // Ensure chart is responsive on web/desktop and fits on mobile
  const chartWidth = useMemo(() => {
    return Math.max(screenWidth - 40, 340);
  }, [screenWidth]);

  // Height allocations
  const mainChartHeight = 220;
  const gap = 25;
  const rsiHeight = showRSI ? 80 : 0;
  const macdHeight = showMACD ? 80 : 0;
  const chartHeight = mainChartHeight + (showRSI ? rsiHeight + gap : 0) + (showMACD ? macdHeight + gap : 0) + 40;

  const visibleCandles = useMemo(() => {
    if (!candles || !candles.length) return [];
    const windowSize = 60;
    const end = Math.max(windowSize, candles.length - panOffset);
    const start = Math.max(0, end - windowSize);
    return candles.slice(start, Math.min(candles.length, start + windowSize));
  }, [candles, panOffset]);

  const activeIndex = hoverIndex !== null ? hoverIndex : visibleCandles.length - 1;
  const activeCandle = visibleCandles[activeIndex] || null;

  // Math bounds for scaling
  const scales = useMemo(() => {
    if (!visibleCandles.length) return null;

    let maxPrice = -Infinity;
    let minPrice = Infinity;
    let maxVolume = -Infinity;
    let maxRSI = 100;
    let minRSI = 0;
    let maxMACD = -Infinity;
    let minMACD = Infinity;

    visibleCandles.forEach((c) => {
      // Main chart price bounds
      let prices = [c.high, c.low, c.open, c.close];
      if (showEMA9 && c.ema_9) prices.push(c.ema_9);
      if (showEMA21 && c.ema_21) prices.push(c.ema_21);
      if (showBB) {
        if (c.bb_upper) prices.push(c.bb_upper);
        if (c.bb_lower) prices.push(c.bb_lower);
      }
      
      const currentMax = Math.max(...prices);
      const currentMin = Math.min(...prices);
      if (currentMax > maxPrice) maxPrice = currentMax;
      if (currentMin < minPrice) minPrice = currentMin;

      // Volume bounds
      if (c.volume > maxVolume) maxVolume = c.volume;

      // MACD bounds
      if (showMACD) {
        const macdVals = [c.macd_line, c.macd_signal, c.macd_hist].filter(x => x !== null);
        if (macdVals.length) {
          const currentMaxMACD = Math.max(...macdVals);
          const currentMinMACD = Math.min(...macdVals);
          if (currentMaxMACD > maxMACD) maxMACD = currentMaxMACD;
          if (currentMinMACD < minMACD) minMACD = currentMinMACD;
        }
      }
    });

    // Padding for price scale
    const priceRange = maxPrice - minPrice;
    maxPrice += priceRange * 0.05;
    minPrice -= priceRange * 0.05;

    // MACD symmetrical scale
    if (showMACD) {
      const bound = Math.max(Math.abs(maxMACD), Math.abs(minMACD)) || 1.0;
      maxMACD = bound;
      minMACD = -bound;
    }

    return { maxPrice, minPrice, maxVolume, maxRSI, minRSI, maxMACD, minMACD };
  }, [visibleCandles, showEMA9, showEMA21, showBB, showMACD]);

  // Coordinate converters
  const getX = (index) => {
    if (!visibleCandles.length) return 0;
    const paddingLeft = 10;
    const paddingRight = 60;
    const innerWidth = chartWidth - paddingLeft - paddingRight;
    return paddingLeft + (index / (visibleCandles.length - 1)) * innerWidth;
  };

  const getY = (price) => {
    if (!scales) return 0;
    const paddingTop = 20;
    const paddingBottom = 20;
    const innerHeight = mainChartHeight - paddingTop - paddingBottom;
    const ratio = (price - scales.minPrice) / (scales.maxPrice - scales.minPrice);
    return mainChartHeight - paddingBottom - ratio * innerHeight;
  };

  const getVolY = (volume) => {
    if (!scales || scales.maxVolume === 0) return mainChartHeight;
    // Volume overlay stays in the bottom 25% of main chart
    const maxHeight = mainChartHeight * 0.25;
    const paddingBottom = 10;
    const ratio = volume / scales.maxVolume;
    return mainChartHeight - paddingBottom - ratio * maxHeight;
  };

  const getRsiY = (rsiVal) => {
    if (!showRSI || !scales) return 0;
    const startY = mainChartHeight + gap;
    const innerHeight = rsiHeight - 20;
    const ratio = (rsiVal - 0) / 100;
    return startY + rsiHeight - 10 - ratio * innerHeight;
  };

  const getMacdY = (macdVal) => {
    if (!showMACD || !scales) return 0;
    const startY = mainChartHeight + gap + rsiHeight + (showRSI ? gap : 0);
    const innerHeight = macdHeight - 20;
    const range = scales.maxMACD - scales.minMACD;
    const ratio = (macdVal - scales.minMACD) / (range || 1);
    return startY + macdHeight - 10 - ratio * innerHeight;
  };

  // Interactive mouse/touch movement handler
  const handleTouch = (event) => {
    if (!visibleCandles.length) return;
    const paddingLeft = 10;
    const paddingRight = 60;
    const innerWidth = chartWidth - paddingLeft - paddingRight;

    // Support both Web (nativeEvent.offsetX) and mobile coordinates
    const touchX = event.nativeEvent.offsetX ?? event.nativeEvent.locationX;
    if (touchX === undefined) return;

    // Calculate nearest bar index
    const relativeX = touchX - paddingLeft;
    let index = Math.round((relativeX / innerWidth) * (visibleCandles.length - 1));
    index = Math.max(0, Math.min(visibleCandles.length - 1, index));
    setHoverIndex(index);
  };

  const handleTouchLeave = () => {
    setHoverIndex(null);
  };

  // Precompile dynamic SVG shapes and paths
  const svgElements = useMemo(() => {
    if (!scales || !visibleCandles.length) return null;

    const candleWidth = (chartWidth - 70) / visibleCandles.length;
    const shapes = [];

    // --- 1. Bollinger Bands Fill ---
    if (showBB) {
      let upperPoints = [];
      let lowerPoints = [];
      visibleCandles.forEach((c, idx) => {
        if (c.bb_upper && c.bb_lower) {
          const x = getX(idx);
          upperPoints.push(`${x},${getY(c.bb_upper)}`);
          lowerPoints.unshift(`${x},${getY(c.bb_lower)}`);
        }
      });
      if (upperPoints.length && lowerPoints.length) {
        const polyPoints = [...upperPoints, ...lowerPoints].join(' ');
        shapes.push(
          <Polygon
            key="bb-fill"
            points={polyPoints}
            fill="rgba(156, 39, 176, 0.05)"
          />
        );
      }
    }

    // --- 2. Bollinger Bands Boundary Lines ---
    if (showBB) {
      let upperPath = '';
      let lowerPath = '';
      let middlePath = '';
      visibleCandles.forEach((c, idx) => {
        const x = getX(idx);
        if (c.bb_upper && c.bb_lower && c.bb_middle) {
          upperPath += `${idx === 0 ? 'M' : 'L'} ${x} ${getY(c.bb_upper)} `;
          lowerPath += `${idx === 0 ? 'M' : 'L'} ${x} ${getY(c.bb_lower)} `;
          middlePath += `${idx === 0 ? 'M' : 'L'} ${x} ${getY(c.bb_middle)} `;
        }
      });
      shapes.push(
        <Path key="bb-upper" d={upperPath} stroke="rgba(156, 39, 176, 0.4)" strokeWidth={1} strokeDasharray="3,3" fill="none" />,
        <Path key="bb-lower" d={lowerPath} stroke="rgba(156, 39, 176, 0.4)" strokeWidth={1} strokeDasharray="3,3" fill="none" />,
        <Path key="bb-middle" d={middlePath} stroke="rgba(0, 150, 136, 0.4)" strokeWidth={1} fill="none" />
      );
    }

    // --- 3. Line Chart mode Path ---
    if (chartType === 'line') {
      let areaPath = `M ${getX(0)} ${mainChartHeight - 10} `;
      let linePath = '';
      visibleCandles.forEach((c, idx) => {
        const x = getX(idx);
        const y = getY(c.close);
        linePath += `${idx === 0 ? 'M' : 'L'} ${x} ${y} `;
        areaPath += `L ${x} ${y} `;
      });
      areaPath += `L ${getX(visibleCandles.length - 1)} ${mainChartHeight - 10} Z`;
      
      shapes.push(
        <Path key="line-area" d={areaPath} fill="url(#areaGrad)" />,
        <Path key="line-chart" d={linePath} stroke="#ff5722" strokeWidth={2} fill="none" />
      );
    }

    // --- 4. Candlesticks Overlay ---
    visibleCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#26a69a' : '#ef5350';

      // Candlestick wicks & volume
      if (chartType === 'candle') {
        const yOpen = getY(c.open);
        const yClose = getY(c.close);
        const yHigh = getY(c.high);
        const yLow = getY(c.low);
        const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
        const bodyY = Math.min(yOpen, yClose);

        shapes.push(
          <Line key={`wick-${idx}`} x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1.5} />,
          <Rect
            key={`body-${idx}`}
            x={x - candleWidth / 2 + 1}
            y={bodyY}
            width={Math.max(candleWidth - 2, 2)}
            height={bodyHeight}
            fill={color}
          />
        );
      }

      // Volume overlay at bottom of main chart
      const volY = getVolY(c.volume);
      shapes.push(
        <Rect
          key={`vol-${idx}`}
          x={x - candleWidth / 2 + 1.5}
          y={volY}
          width={Math.max(candleWidth - 3, 1)}
          height={mainChartHeight - 10 - volY}
          fill={isGreen ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)'}
        />
      );
    });

    // --- 5. EMA overlays ---
    if (showEMA9) {
      let ema9Path = '';
      visibleCandles.forEach((c, idx) => {
        if (c.ema_9) {
          ema9Path += `${ema9Path === '' ? 'M' : 'L'} ${getX(idx)} ${getY(c.ema_9)} `;
        }
      });
      shapes.push(
        <Path key="ema-9" d={ema9Path} stroke="#2196f3" strokeWidth={1.5} fill="none" />
      );
    }
    if (showEMA21) {
      let ema21Path = '';
      visibleCandles.forEach((c, idx) => {
        if (c.ema_21) {
          ema21Path += `${ema21Path === '' ? 'M' : 'L'} ${getX(idx)} ${getY(c.ema_21)} `;
        }
      });
      shapes.push(
        <Path key="ema-21" d={ema21Path} stroke="#ff9800" strokeWidth={1.5} fill="none" />
      );
    }

    // --- 6. RSI Subplot ---
    if (showRSI) {
      const rsi30 = getRsiY(30);
      const rsi70 = getRsiY(70);
      let rsiPath = '';
      visibleCandles.forEach((c, idx) => {
        if (c.rsi_14 !== null) {
          rsiPath += `${rsiPath === '' ? 'M' : 'L'} ${getX(idx)} ${getRsiY(c.rsi_14)} `;
        }
      });

      shapes.push(
        // Shaded 30-70 band
        <Rect
          key="rsi-band"
          x={getX(0)}
          y={rsi70}
          width={getX(visibleCandles.length - 1) - getX(0)}
          height={rsi30 - rsi70}
          fill="rgba(103, 58, 183, 0.08)"
        />,
        // Guide lines
        <Line key="rsi-line-70" x1={getX(0)} y1={rsi70} x2={getX(visibleCandles.length - 1)} y2={rsi70} stroke="rgba(103, 58, 183, 0.2)" strokeDasharray="3,3" />,
        <Line key="rsi-line-30" x1={getX(0)} y1={rsi30} x2={getX(visibleCandles.length - 1)} y2={rsi30} stroke="rgba(103, 58, 183, 0.2)" strokeDasharray="3,3" />,
        // Subplot labels
        <SvgText key="rsi-lbl-70" x={chartWidth - 55} y={rsi70 + 4} fill="#808a9d" fontSize={9}>70</SvgText>,
        <SvgText key="rsi-lbl-30" x={chartWidth - 55} y={rsi30 + 4} fill="#808a9d" fontSize={9}>30</SvgText>,
        // The RSI line
        <Path key="rsi-line" d={rsiPath} stroke="#ab47bc" strokeWidth={1.5} fill="none" />
      );
    }

    // --- 7. MACD Subplot ---
    if (showMACD) {
      const startY = mainChartHeight + gap + rsiHeight + (showRSI ? gap : 0);
      const centerZeroY = getMacdY(0);

      let macdPath = '';
      let signalPath = '';

      // Grid/zero-line
      shapes.push(
        <Line key="macd-zero" x1={getX(0)} y1={centerZeroY} x2={getX(visibleCandles.length - 1)} y2={centerZeroY} stroke="rgba(255, 255, 255, 0.1)" />
      );

      visibleCandles.forEach((c, idx) => {
        const x = getX(idx);
        
        // MACD histogram bars
        if (c.macd_hist !== null) {
          const histY = getMacdY(c.macd_hist);
          shapes.push(
            <Line
              key={`macd-hist-${idx}`}
              x1={x}
              y1={centerZeroY}
              x2={x}
              y2={histY}
              stroke={c.macd_hist >= 0 ? '#26a69a' : '#ef5350'}
              strokeWidth={Math.max(candleWidth - 2, 1.5)}
            />
          );
        }

        // Paths for MACD & Signal lines
        if (c.macd_line !== null) macdPath += `${macdPath === '' ? 'M' : 'L'} ${x} ${getMacdY(c.macd_line)} `;
        if (c.macd_signal !== null) signalPath += `${signalPath === '' ? 'M' : 'L'} ${x} ${getMacdY(c.macd_signal)} `;
      });

      shapes.push(
        <Path key="macd-line-plot" d={macdPath} stroke="#2196f3" strokeWidth={1.2} fill="none" />,
        <Path key="macd-signal-plot" d={signalPath} stroke="#ff9800" strokeWidth={1.2} fill="none" />
      );
    }

    // --- 8. Floating crosshairs ---
    if (hoverIndex !== null) {
      const activeX = getX(hoverIndex);
      const activeY = getY(visibleCandles[hoverIndex].close);

      shapes.push(
        // Vertical cursor crosshair
        <Line
          key="cursor-v"
          x1={activeX}
          y1={0}
          x2={activeX}
          y2={chartHeight - 40}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />,
        // Horizontal cursor crosshair
        <Line
          key="cursor-h"
          x1={0}
          y1={activeY}
          x2={chartWidth - 60}
          y2={activeY}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />,
        // Highlight active point
        <Line
          key="cursor-node"
          x1={activeX - 3}
          y1={activeY}
          x2={activeX + 3}
          y2={activeY}
          stroke="#ff5722"
          strokeWidth={3}
        />
      );
    }

    // --- 9. Active Trade Lines (Binomo Style) ---
    if (activeTrades && activeTrades.length > 0) {
      activeTrades.forEach((trade, idx) => {
        const tradeY = getY(trade.price);
        const color = trade.type === 'BUY' ? '#26a69a' : '#ef5350';
        shapes.push(
          <Line 
            key={`trade-${idx}`} 
            x1={getX(0)} 
            y1={tradeY} 
            x2={chartWidth - 60} 
            y2={tradeY} 
            stroke={color} 
            strokeWidth={2} 
            strokeDasharray="4,4" 
          />,
          <Rect 
            key={`trade-bg-${idx}`}
            x={chartWidth - 60}
            y={tradeY - 10}
            width={60}
            height={20}
            fill={color}
            rx={4}
          />,
          <SvgText 
            key={`trade-lbl-${idx}`}
            x={chartWidth - 55}
            y={tradeY + 4}
            fill="#ffffff"
            fontSize={9}
            fontWeight="bold"
          >
            {trade.type}
          </SvgText>
        );
      });
    }

    return shapes;
  }, [visibleCandles, scales, chartType, showEMA9, showEMA21, showBB, showRSI, showMACD, hoverIndex, chartWidth, activeTrades]);

  // X Axis and Y Axis grid labels
  const gridLines = useMemo(() => {
    if (!scales || !visibleCandles.length) return null;

    const lines = [];
    const numYGrid = 5;

    // Y Axis grid lines & labels on main chart
    for (let i = 0; i < numYGrid; i++) {
      const ratio = i / (numYGrid - 1);
      const price = scales.minPrice + ratio * (scales.maxPrice - scales.minPrice);
      const y = getY(price);

      lines.push(
        <Line key={`y-grid-${i}`} x1={0} y1={y} x2={chartWidth - 60} y2={y} stroke={theme.isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"} />,
        <SvgText key={`y-lbl-${i}`} x={chartWidth - 55} y={y + 4} fill={theme.textSecondary} fontSize={9}>
          {Math.round(price)}
        </SvgText>
      );
    }

    // X Axis time labels (draws 4-5 sample dates)
    const stride = Math.floor(visibleCandles.length / 4) || 15;
    for (let i = 0; i < visibleCandles.length; i += stride) {
      const x = getX(i);
      const candle = visibleCandles[i];
      let displayTime = candle.time;
      if (displayTime.includes(' ')) {
        // Shorten datetime representation
        displayTime = displayTime.split(' ')[1].substring(0, 5);
      }

      lines.push(
        <Line key={`x-grid-${i}`} x1={x} y1={0} x2={x} y2={chartHeight - 40} stroke={theme.isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.04)"} />,
        <SvgText key={`x-lbl-${i}`} x={x - 12} y={chartHeight - 20} fill={theme.textSecondary} fontSize={8}>
          {displayTime}
        </SvgText>
      );
    }

    return lines;
  }, [scales, visibleCandles, chartWidth, chartHeight, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* 1. Glassmorphic Stock Data Header (OHLC readout) */}
      <View style={[styles.ohlcHeader, { borderColor: theme.border }]}>
        {activeCandle ? (
          <View style={styles.ohlcRow}>
            <View style={styles.ohlcCol}>
              <Text style={[styles.ohlcLabel, { color: theme.textSecondary }]}>O</Text>
              <Text style={[styles.ohlcVal, { color: theme.text }, activeCandle.close >= activeCandle.open ? styles.textGreen : styles.textRed]}>
                {activeCandle.open.toFixed(2)}
              </Text>
            </View>
            <View style={styles.ohlcCol}>
              <Text style={[styles.ohlcLabel, { color: theme.textSecondary }]}>H</Text>
              <Text style={[styles.ohlcVal, { color: theme.text }]}>{activeCandle.high.toFixed(2)}</Text>
            </View>
            <View style={styles.ohlcCol}>
              <Text style={[styles.ohlcLabel, { color: theme.textSecondary }]}>L</Text>
              <Text style={[styles.ohlcVal, { color: theme.text }]}>{activeCandle.low.toFixed(2)}</Text>
            </View>
            <View style={styles.ohlcCol}>
              <Text style={[styles.ohlcLabel, { color: theme.textSecondary }]}>C</Text>
              <Text style={[styles.ohlcVal, { color: theme.text }, activeCandle.close >= activeCandle.open ? styles.textGreen : styles.textRed]}>
                {activeCandle.close.toFixed(2)}
              </Text>
            </View>
            <View style={styles.ohlcCol}>
              <Text style={[styles.ohlcLabel, { color: theme.textSecondary }]}>V</Text>
              <Text style={[styles.ohlcVal, { color: theme.text }]}>{activeCandle.volume.toLocaleString()}</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>No candle data selected</Text>
        )}

        {/* Dynamic active indicator values overlay */}
        {activeCandle && (
          <View style={styles.indicatorsRow}>
            {showEMA9 && activeCandle.ema_9 && (
              <Text style={[styles.indicatorVal, { color: '#2196f3' }]}>EMA(9): {activeCandle.ema_9.toFixed(2)}</Text>
            )}
            {showEMA21 && activeCandle.ema_21 && (
              <Text style={[styles.indicatorVal, { color: '#ff9800' }]}>EMA(21): {activeCandle.ema_21.toFixed(2)}</Text>
            )}
            {showRSI && activeCandle.rsi_14 && (
              <Text style={[styles.indicatorVal, { color: '#ab47bc' }]}>RSI(14): {activeCandle.rsi_14.toFixed(1)}</Text>
            )}
            {showMACD && activeCandle.macd_line && (
              <Text style={[styles.indicatorVal, { color: '#ff5722' }]}>
                MACD: {activeCandle.macd_line.toFixed(2)} | Sig: {activeCandle.macd_signal?.toFixed(2)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Chart Navigation & Market Controls Bar */}
      <View style={[styles.navBar, { borderColor: theme.border }]}>
        <View style={styles.panControls}>
          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, (!candles || panOffset >= candles.length - 60) && styles.navBtnDisabled]} 
            onPress={handlePanBack}
            disabled={!candles || panOffset >= candles.length - 60}
          >
            <Text style={[styles.navBtnText, { color: theme.text }]}>⏪ Move Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, panOffset === 0 && styles.navBtnDisabled]} 
            onPress={handlePanFwd}
            disabled={panOffset === 0}
          >
            <Text style={[styles.navBtnText, { color: theme.text }]}>Move Fwd ⏩</Text>
          </TouchableOpacity>

          {panOffset > 0 && (
            <TouchableOpacity style={[styles.navBtn, styles.liveSnapBtn]} onPress={handlePanLive}>
              <Text style={styles.liveSnapBtnText}>Live ⏺️</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.liveToggleBtn, isMarketLive ? styles.liveActive : styles.livePaused, { borderColor: isMarketLive ? '#26a69a' : '#ef5350' }]} 
          onPress={handleToggleLive}
          disabled={togglingLive}
        >
          <Text style={[styles.liveToggleBtnText, isMarketLive ? styles.liveActiveText : styles.livePausedText]}>
            {isMarketLive ? '🟢 Market Live' : '🔴 Freeze Market (Paused)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Interactive SVG Drawing Surface */}
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={handleTouchLeave}
        onResponderTerminate={handleTouchLeave}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ff5722" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#ff5722" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          
          {/* Grid backplane */}
          {gridLines}
          
          {/* Main plots and subplots */}
          {svgElements}
        </Svg>
      </View>

      {/* 3. Controls Pane (Toggles for styles, scales, subplots) - Hidden in Minimal Mode */}
      {!minimalMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsBar}>
          {/* Toggle Chart Type */}
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }]} onPress={() => setChartType(prev => prev === 'candle' ? 'line' : 'candle')}>
            <Text style={[styles.controlText, { color: theme.text }]}>Type: {chartType === 'candle' ? 'Candles 🕯️' : 'Line 📈'}</Text>
          </TouchableOpacity>

          {/* Toggles for Indicators */}
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, showEMA9 && styles.controlBtnActive, showEMA9 && { borderColor: theme.accent }]} onPress={() => setShowEMA9(!showEMA9)}>
            <Text style={[styles.controlText, { color: theme.text }, showEMA9 && styles.textActive]}>EMA 9</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, showEMA21 && styles.controlBtnActive, showEMA21 && { borderColor: theme.accent }]} onPress={() => setShowEMA21(!showEMA21)}>
            <Text style={[styles.controlText, { color: theme.text }, showEMA21 && styles.textActive]}>EMA 21</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, showBB && styles.controlBtnActive, showBB && { borderColor: theme.accent }]} onPress={() => setShowBB(!showBB)}>
            <Text style={[styles.controlText, { color: theme.text }, showBB && styles.textActive]}>Bollinger Bands</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, showRSI && styles.controlBtnActive, showRSI && { borderColor: theme.accent }]} onPress={() => setShowRSI(!showRSI)}>
            <Text style={[styles.controlText, { color: theme.text }, showRSI && styles.textActive]}>RSI Subplot</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.isDark ? '#21262d' : '#ffffff', borderColor: theme.border }, showMACD && styles.controlBtnActive, showMACD && { borderColor: theme.accent }]} onPress={() => setShowMACD(!showMACD)}>
            <Text style={[styles.controlText, { color: theme.text }, showMACD && styles.textActive]}>MACD Subplot</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 4. Time Intervals Selection */}
      <View style={[styles.intervalBar, { borderColor: theme.border }]}>
        {[
          { val: '1m', label: '1M' },
          { val: '5m', label: '5M' },
          { val: '1d', label: '1D' },
          { val: '1mo', label: '1 MONTH' },
          { val: '1y', label: '1 YEAR' },
          { val: 'max', label: 'LIFETIME' }
        ].map((item) => (
          <TouchableOpacity
            key={item.val}
            style={[styles.intervalBtn, activeInterval === item.val && styles.intervalBtnActive, activeInterval === item.val && { backgroundColor: theme.accentLight }]}
            onPress={() => onIntervalChange && onIntervalChange(item.val)}
          >
            <Text style={[styles.intervalText, { color: theme.textSecondary }, activeInterval === item.val && styles.intervalTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    marginVertical: 10,
  },
  ohlcHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#30363d',
  },
  ohlcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ohlcCol: {
    alignItems: 'center',
    flex: 1,
  },
  ohlcLabel: {
    color: '#808a9d',
    fontSize: 9,
    fontWeight: 'bold',
  },
  ohlcVal: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  indicatorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    justifyContent: 'center',
  },
  indicatorVal: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    marginHorizontal: 6,
    marginVertical: 2,
  },
  loadingText: {
    color: '#808a9d',
    textAlign: 'center',
    fontSize: 12,
  },
  canvasContainer: {
    marginVertical: 10,
    cursor: 'crosshair', // premium hover crosshair effect on web
  },
  controlsBar: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'center',
  },
  controlBtn: {
    backgroundColor: '#21262d',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  controlBtnActive: {
    backgroundColor: '#0c1017',
    borderColor: '#ff5722',
  },
  controlText: {
    color: '#c9d1d9',
    fontSize: 10,
  },
  textActive: {
    color: '#ff5722',
    fontWeight: 'bold',
  },
  intervalBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#30363d',
    paddingTop: 10,
    marginTop: 5,
    justifyContent: 'space-around',
  },
  intervalBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  intervalBtnActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  intervalText: {
    color: '#808a9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  intervalTextActive: {
    color: '#ff5722',
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#21262d',
    marginBottom: 8,
  },
  panControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    backgroundColor: '#21262d',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#c9d1d9',
    fontSize: 10.5,
    fontWeight: '600',
  },
  liveSnapBtn: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderColor: '#ff5722',
  },
  liveSnapBtnText: {
    color: '#ff5722',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  liveToggleBtn: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  liveToggleBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  liveActive: {
    backgroundColor: 'rgba(38, 166, 154, 0.12)',
    borderColor: '#26a69a',
  },
  livePaused: {
    backgroundColor: 'rgba(239, 83, 80, 0.12)',
    borderColor: '#ef5350',
  },
  liveActiveText: {
    color: '#26a69a',
  },
  livePausedText: {
    color: '#ef5350',
  },
});

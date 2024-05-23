/* eslint-disable no-loop-func */
//@ts-nocheck
import React, { useRef, useEffect, useState } from "react";
import { Radio, Checkbox, InputNumber } from "antd";
import * as d3 from "d3";
import "./index.less";
import { IRepoCluster } from "./type.ts";
import SubclusterDetails from "./subclusterDetails.tsx";
import { repoClusterDt } from "../../utils/testData.ts";

const CheckboxGroup = Checkbox.Group;
const checkboxOptions = ["fork", "watch"];
const starColor = "#d46b08",
  forkColor = "#db3275",
  watchColor = "#21a2f1";
const axisType = {
  "score-star": {
    xAxisType: "score",
    yAxisType: "star",
  },
  "date-score": {
    xAxisType: "date",
    yAxisType: "score",
  },
  "date-star": {
    xAxisType: "date",
    yAxisType: "star",
  },
};

var xAxisType = "score",
  yAxisType = "star"; // 初始化时的横轴轴

var originTopicClusterDt: IRepoCluster[]; // 用来存储过滤后的数据
var data: IRepoCluster[]; // 用来存储排序后的数据

interface IRepoClusterProps {
  forkMin: number;
  forkMax: number;
  watchMin: number;
  watchMax: number;
  topicClusterDt: IRepoCluster[];
  subclusterDt: {
    languageDt: [];
    techDt: [];
  };
  selectedTopicId: string;
  setSelectedRepoId: (p) => void;
  setUiLeftDirection: (p) => void;
}
const RepoCluster = (props: IRepoClusterProps) => {
  let {
    topicClusterDt,
    forkMax,
    forkMin,
    watchMax,
    watchMin,
    subclusterDt,
    selectedTopicId,
    setSelectedRepoId,
    setUiLeftDirection 
  } = {
    ...props,
  };
  // let { topicClusterDt, forkMax, forkMin, watchMax, watchMin, subclusterDt } = {
  //   ...repoClusterDt,
  // };
  // const [axisValue, setAxisValue] = useState("score-star"); // 默认的值
  const [axisValue, setAxisValue] = useState("date-star"); // 默认的值
  const [openedP, setOpenedP] = useState([]); // 设置被展开的节点（保留x坐标的信息）
  const [circleRadius, setCircleRadius] = useState<number>(10); // 设置小圆的半径
  const [clusterDFilter, setClusterDFilter] = useState({
    language: [],
    tech: [],
    shouldBeIncluded: true,
    isClear: false, // 默认不清除
  });
  const [checkedList, setCheckedList] = useState(["fork", "watch"]); // 默认值展示出一种数值信息

  const chartRef = useRef();
  
  originTopicClusterDt = [...topicClusterDt];

  useEffect(() => {
    if (topicClusterDt && topicClusterDt.length !== 0) {
      data = topicClusterDt.sort((a, b) => multiRuleSort(a, b)); // 对数据根据x轴的值进行排序
      drawClusterDetails(data);
    }
  }, [topicClusterDt]);

  // 根据左侧图的过滤条件渲染对应的数据
  useEffect(() => {
    if (clusterDFilter.isClear) {
      data = topicClusterDt.sort((a, b) => multiRuleSort(a, b)); // 对数据根据x轴的值进行排序
      drawClusterDetails(data);
      console.log("清除过滤");
    } else if (
      clusterDFilter.language.length !== 0 ||
      clusterDFilter.tech.length !== 0
    ) {
      console.log("执行过滤");
      if (clusterDFilter.shouldBeIncluded) {
        // 选择之后应该是需要的内容
        originTopicClusterDt = topicClusterDt.filter((d) => {
          let tpc = d.tech;
          let lan = d.language;
          return (
            tpc.some((d) => clusterDFilter.tech.includes(d)) ||
            lan.some((d) => clusterDFilter.language.includes(d)) // 只要包含两者之间的任一个就可以
          );
        });
      } else {
        // 选择的是不需要的内容
        originTopicClusterDt = topicClusterDt.filter((d) => {
          let tpc = d.tech;
          let lan = d.language;
          return (
            tpc.every((d) => !clusterDFilter.tech.includes(d)) ||
            lan.every((d) => !clusterDFilter.language.includes(d))
          );
        });
      }

      data = originTopicClusterDt.sort((a, b) => multiRuleSort(a, b)); // 对数据根据x轴的值进行排序
      drawClusterDetails(data);
    }
  }, [clusterDFilter]);

  useEffect(() => {
    if (topicClusterDt && topicClusterDt?.length !== 0) {
      xAxisType = axisType[axisValue]["xAxisType"];
      yAxisType = axisType[axisValue]["yAxisType"];
      data = topicClusterDt.sort((a, b) => multiRuleSort(a, b)); // 根据新的排序依据对数据进行排序
      drawClusterDetails(data, checkedList);
    }
  }, [axisValue, checkedList, openedP, circleRadius]);

  const drawClusterDetails = (data, numberType = ["fork", "watch"]) => {
    d3.selectAll(`div#cluster-details svg`).remove(); // 每次重绘前清空之前的内容
    d3.selectAll(`div#cluster-details div.toolTip`).remove(); // 每次重绘前清空之前的内容

    if (data.length === 0) return;
    const margin = { top: 10, bottom: 10, left: 50, right: 50 };
    const legendH = 30,
      legendW = 400; // 图例的长宽
    const interval = 10; // 上下坐标轴之间的间隙
    const circleR = circleRadius;
    let yAvg = average(data);
    const height =
      Math.floor(chartRef.current.offsetHeight) - margin.top - margin.bottom;

    let width =
      Math.floor(chartRef.current.offsetWidth) - margin.left - margin.right;
    const [mergeData, maxWidth, xLabel] = mergeDataFunc(
      data,
      height,
      circleR,
      yAvg,
      interval
    );
    //@ts-ignore
    const yData = mergeData.map((item) => item[yAxisType]).sort(d3.ascending); // 取出所有的y值并进行排序
    const [ymin, ymax] = [yData[0], yData[yData.length - 1]]; // y轴的最值，用于颜色映射

    // if( (maxWidth + 200) <  document.getElementById("cluster-details-chart-id").offsetWidth){
    //   chartRef.current.style.width = document.getElementById("cluster-details-chart-id").offsetWidth
    // }else{
    //   chartRef.current.style.width = `${maxWidth + 200}px`; // 这样第一次显示长度超过div的时候会显示出错
    //   // width = `${maxWidth + 200}px`;
    // }

    // @ts-ignore
    document.getElementById("cluster-details").style.width = `${
      maxWidth + 200
    }px`; // 根据元素的数量动态设置内部div的高度

    const colorScale = d3.scaleSequential([ymin, ymax], ["#feedde", starColor]);
    const forkColorScale = d3.scaleSequential(
      [forkMin, forkMax],
      ["#f6dbe8", forkColor]
    );
    const watchColorScale = d3.scaleSequential(
      [watchMin, watchMax],
      ["#d3ecfc", watchColor]  // "#21a2f1"
    );
    const colorRectScale = d3.scaleSequential(
      [ymin, ymax],
      ["#feedde", starColor]
    );
    const innerPieColorScale = d3.scaleSequential(
      [ymin, ymax],
      d3.interpolateReds
    );
    // 添加tooltip
    const tooltip = d3
      .select("#cluster-details")
      .append("div")
      .attr("class", "toolTip");

    const svg = d3
      .select("#cluster-details")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("background", "white")
      .attr("width", "100%")
      .attr("height", "100%");

    // 定义颜色映射
    drawLegend(); // 绘制legend
    const wrapper = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    // 坐标轴的箭头表示符号
    const markerWidth = 10,
      markerHeight = 10;
    svg
      .append("defs")
      .append("marker")
      .attr("id", "cluster-edtails-arrow")
      .attr("viewBox", [0, 0, 10, 10])
      .attr("refX", markerWidth / 2)
      .attr("refY", markerHeight / 2)
      .attr("markerWidth", markerWidth)
      .attr("markerHeight", markerHeight)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr(
        "d",
        d3.line()([
          [0, 0],
          [0, markerHeight],
          [markerWidth, markerHeight / 2],
        ])
      )
      .attr("stroke", "black");
    // 添加纵向坐标轴
    wrapper
      .append("text")
      .attr("x", -5)
      .attr("y", height / 2)
      .attr("dy", "0.35em")
      .style("fill", "rgba(51, 51, 51, 1)")
      .style("font-size", "0.7em")
      .style("text-anchor", "end")
      .text(yAvg);

    // 添加轴线
    wrapper
      .selectAll(".xLabelRect")
      .data(xLabel)
      .join("rect")
      .attr("class", "xLabelRect")
      .attr("x", (d) => d[0] * 2 * circleR)
      .attr("y", (height - interval) / 2)
      .attr("width", (d) => d[1] * 2 * circleR)
      .attr("height", interval)
      .attr("fill", (d, i) => {
        if (i % 2 !== 0) {
          return "#aaa";
        }
        return "#fff";
      });

    wrapper
      .append("path")
      .attr(
        "d",
        d3.line()([
          [0, height / 2],
          [0, height - 5],
        ])
      )
      .attr("stroke", "rgba(51, 51, 51, 1)")
      .attr("stroke", "black")
      .attr("stroke-width", "0.5")
      .attr("marker-end", "url(#cluster-edtails-arrow)")
      .attr("fill", "none");
    wrapper.append("path");
    wrapper
      .append("path")
      .attr(
        "d",
        d3.line()([
          [0, height / 2],
          [0, 5],
        ])
      )
      .attr("stroke", "rgba(51, 51, 51, 1)")
      .attr("stroke", "black")
      .attr("stroke-width", "0.5")
      .attr("marker-end", "url(#cluster-edtails-arrow)")
      .attr("fill", "none");
    wrapper
      .append("path")
      .attr(
        "d",
        d3.line()([
          [0, height / 2],
          [maxWidth + 20, height / 2],
        ])
      )
      .attr("stroke", "rgba(51, 51, 51, 1)")
      .attr("stroke-width", "0.5")
      .attr("marker-end", "url(#cluster-edtails-arrow)")
      .attr("fill", "none");
    // 坐标轴标签
    wrapper
      .append("text")
      .attr("x", 0)
      .attr("y", 1)
      .style("fill", "#1e1e1e")
      .style("font-size", "0.7em")
      .style("text-anchor", "middle")
      .text(yAxisType);
    wrapper
      .append("text")
      .attr("x", maxWidth + 25)
      .attr("y", height / 2)
      .attr("dy", "0.35em")
      .style("fill", "#1e1e1e")
      .style("font-size", "0.7em")
      .style("text-anchor", "start")
      .text(xAxisType);
    const nodeEnter = wrapper
      .append("g")
      .attr("class", "chart-g")
      .selectAll("g")
      .data(mergeData)
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("class", "chart-g")
      // .on("click", function (event, d) {
      //   setSelectedRepoId(d.id); // id就是repoId
      //   setUiLeftDirection(false);  
      // })
      .on("dblclick", function (event, d) {
        // 单击展开节点
        event.stopPropagation();
        let curXValToYVal = `${d[xAxisType]}_${d[yAxisType]}`; // 横坐标的值
        let temp = [...openedP];
        // if(d.group.length === 0) return // 不处理单个点的点击事件
        if (temp.indexOf(curXValToYVal) === -1) {
          // 当前集合中不存在这个元素，则添加新的元素进去
          setOpenedP((openedP) => [...openedP, curXValToYVal]);
        } else {
          // 当前数组中存在这个元素，则表示要将这个元素组合折叠
          let tt = temp.filter((d) => d !== curXValToYVal); // 过滤掉被删除的节点
          setOpenedP([...tt]);
        }
      });

    let pieType = ["star"].concat(numberType);
    for (let i in pieType) {
      nodeEnter
        .filter((d) => isSingleNode(d)) // 感觉还是线圈图好看一些
        // .append("path")
        // .attr(
        //   "d",
        //   d3
        //     .arc()
        //     .innerRadius(0)
        //     .outerRadius(circleR)
        //     .startAngle(calStartAngle(parseInt(i), pieType.length))
        //     .endAngle((d) =>
        //       calcFinalAng(parseInt(i), pieType[i], pieType.length, d)
        //     )
        //     .cornerRadius(2)
        //     .padAngle(0.1)
        // )
        .append("circle")
        .attr("cx", 0) // 计算出来的x、y值   // 用弦图和线圈图做对比
        .attr("cy", 0)
        .attr("xval", (d) => d[xAxisType])
        .attr("yval", (d) => d[yAxisType])
        .attr("r", calCircleR(parseInt(i), circleR, pieType.length))
        .attr("stroke", "#CC0000") // 矩形节点展开之后的颜色
        .attr("stroke-width", (d) => {
          let curXValToYVal = `${d[xAxisType]}_${d[yAxisType]}`; // 只给最外层的边框加粗
          if (openedP.indexOf(curXValToYVal) !== -1 && parseInt(i) === 0) {
            // 当前集合展开集合中存在这个点所在的组
            return "1";
          }
          return "0";
        })
        .attr("fill", (d) => calCircleColor(pieType[i], d, yAxisType))
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          let name_Arr = d["id"].split("_");
          name_Arr.shift();
          let nameStr = name_Arr.join("_");

          let html = `<strong>${nameStr}: </strong><br>${xAxisType}:${d[xAxisType]}<br><span style="color: ${starColor}">${yAxisType}</span>:${d[yAxisType]}`;
          if (numberType.includes("fork")) {
            html += `<br><span style="color: ${forkColor}">fork</span>:${d["fork"]}`;
          }
          if (numberType.includes("watch")) {
            html += `<br><span style="color: ${watchColor}">watch</span>:${d["watch"]}`;
          }
          tooltip
            .style("left", event.layerX + 18 + "px")
            .style("top", event.layerY + 18 + "px")
            .style("display", "block")
            .html(html);
          let curXValToYVal = `${d[xAxisType]}_${d[yAxisType]}`;
          if (openedP.indexOf(curXValToYVal) === -1) {
            // 当前集合展开集合中不存在这个点所在的组
            d3.select(this).attr("stroke-width", "0.5");
          }
        })
        .on("mouseout", function (event, d) {
          tooltip.style("display", "none"); // Hide toolTip
          let curXValToYVal = `${d[xAxisType]}_${d[yAxisType]}`;
          if (openedP.indexOf(curXValToYVal) === -1) {
            // 当前集合展开集合中不存在这个点所在的组
            d3.select(this).attr("stroke-width", "0");
          }
        });
    }

    const arc = d3
      .arc()
      .innerRadius(circleR - 2)
      .outerRadius(circleR);
    nodeEnter
      .filter((d) => !isSingleNode(d))
      .each(function (d) {
        d3.select(this)
          .append("rect")
          .attr("x", -circleR) // 计算出来的x、y值
          .attr("y", -circleR)
          .attr("xval", (d) => d[xAxisType])
          .attr("yval", (d) => d[yAxisType])
          .attr("width", circleR * 2)
          .attr("height", circleR * 2)
          .attr("fill", (d) => colorRectScale(d[yAxisType]))
          .style("cursor", "pointer")
          .on("mouseover", function (event, d) {
            d3.select(this)
              .attr("width", 2 * circleR + 2)
              .attr("height", 2 * circleR + 2);
            tooltip
              .style("left", event.layerX + 18 + "px")
              .style("top", event.layerY + 18 + "px")
              .style("display", "block")
              .html(
                `${xAxisType}:${d[xAxisType]}<br>${yAxisType}:${d[yAxisType]}`
              );
          })
          .on("mouseout", function () {
            d3.select(this)
              .attr("width", 2 * circleR)
              .attr("height", 2 * circleR);
            tooltip.style("display", "none"); // Hide toolTip
          });

        // 合并的节点用外围的弧和内部的小圆进行表示
        // let curYVal = d[yAxisType];
        // const arcs = d3
        //   .pie()
        //   .padAngle(0.2)
        //   .sort(null)
        //   .value((d) => d)(new Array(d.group.length).fill(1));
        // d3.select(this)
        //   .selectAll(".arcs")
        //   .data(arcs)
        //   .join("path")
        //   .attr("fill", (d) => innerPieColorScale(curYVal))
        //   .attr("d", arc);
        // d3.select(this)
        //   .append("circle")
        //   .attr("cx", 0) // 计算出来的x、y值
        //   .attr("cy", 0)
        //   .attr("xval", (d) => d[xAxisType])
        //   .attr("yval", (d) => d[yAxisType])
        //   .attr("r", circleR - 2.2)
        //   .attr("fill", (d) => colorScale(d[yAxisType]))
        //   .style("cursor", "pointer")
        //   .on("mouseover", function (event, d) {
        //     d3.select(this).attr("r", circleR - 2);
        //     tooltip
        //       .style("left", event.layerX + 18 + "px")
        //       .style("top", event.offsetY + 18 + "px")
        //       .style("display", "block")
        //       .html(
        //         `${xAxisType}:${d[xAxisType]}<br>${yAxisType}:${d[yAxisType]}`
        //       );
        //   })
        //   .on("mouseout", function (event, d) {
        //     d3.select(this).attr("r", circleR - 2.2);
        //     tooltip.style("display", "none"); // Hide toolTip
        //   })

        //   .on("dblclick", function (event, d) {
        //     // 双击收缩节点
        //     let curXVal = d[xAxisType]; // 横坐标的值
        //     setOpenedP([curXVal]);
        //   });
      });

    function drawLegend() {
      d3.select("div#cluster-details-legend svg").remove();
      const legendSvg = d3
        .select("#cluster-details-legend")
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("background", "white")
        .attr("width", "100%")
        .attr("height", "100%");

      const legendWrapper = legendSvg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${1})`);

      const yDataSet = [...new Set(yData)]; // 对y轴的点进行去重，处理节点展开之后的情况
      const tickSize = yDataSet.length < 100? 10: yDataSet.length < 200? 20: 23;
      
      const rect_number =  Math.ceil(yDataSet.length / tickSize)
      let legendNodeG = legendWrapper
        .selectAll("g")
        .data(d3.range(0, rect_number)) // 生成多个矩形表示不同的区间
        .join("g")
        .attr(
          "transform",
          (d, i) => `translate(${5 + (i * legendW) / (tickSize + 2)}, ${0})`
        );
      legendNodeG
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendW / (tickSize + 2))
        .attr("height", legendH / 2)
        .attr("fill", (d, i) => {
          let curIndex =
            i * tickSize >= yDataSet.length
              ? yDataSet.length - 1
              : i * tickSize;
          return colorScale(yDataSet[curIndex]);
        })
        .on("mouseover", function (event, d) {
          let startVal = yDataSet[d * tickSize];
          let endValue =
            yDataSet[(d + 1) * tickSize] || yDataSet[yDataSet.length - 1];
          nodeEnter
            .filter(
              (d) => !(d[yAxisType] >= startVal && d[yAxisType] <= endValue)
            )
            .attr("opacity", 0.01);
        })
        .on("mouseout", function (event, d) {
          nodeEnter.attr("opacity", 1);
        });

      legendNodeG
        .append("text")
        .attr("dx", 0)
        .attr("dy", legendH - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "0.5em")
        .text((d) => {
          if (d * tickSize >= yDataSet.length) {
            return yAxisType=== 'score' ? yDataSet[d * tickSize].toFixed(2): yDataSet[d * tickSize];
          }
          return yAxisType=== 'score' ? yDataSet[d * tickSize].toFixed(2): yDataSet[d * tickSize];
        });
      legendWrapper
        .append("text")
        .text(yAxisType)
        .attr(
          "x",
          `${
            15 +
            (d3.range(0, Math.ceil(yDataSet.length / tickSize)).length *
              legendW) /
              (tickSize + 2)
          }`
        )
        .attr("y", legendH / 2);
    }

    // 每个扇区的起始角度
    function calcAng(value) {
      return value * (Math.PI / 180);
    }
    function calStartAngle(i, number) {
      let singleSector = 360 / number;
      console.log(999999, i * singleSector);
      return calcAng(i * singleSector);
    }
    function calcFinalAng(i, type, number, d) {
      let singleSector = 360 / number;
      let startAngle = i * singleSector;
      let endAngle = (i + 1) * singleSector;

      return calcAng(endAngle);

      let value, maxValue;
      if (type === "fork") {
        value = d["fork"]; // 当前属性的值
        maxValue = forkMax; // 当前属性的最大值
      } else if (type === "watch") {
        value = d["watch"];
        maxValue = watchMax;
      } else {
        value = d[yAxisType];
        maxValue = ymax;
      }
      return calcAng(startAngle + ((endAngle - startAngle) * value) / maxValue);
    }

    // 计算每个线圈的颜色
    function calCircleColor(type, d, yAxisType) {
      if (type === "fork") return forkColorScale(d["fork"]);
      if (type === "watch") return watchColorScale(d["watch"]);
      return colorScale(d[yAxisType]);
    }
  };

  // 对排序后的数据根据y轴的值进行合并(合并同一个x下相同y值的点)
  function mergeDataFunc(data, h, r, yAvg, interval) {
    let mergeData = [{ ...data[0], group: [], x: r, y: h / 2 - r }]; // 把第一条数据放进去并初始化类型为单个点，第一个点的位置位于初始位置
    let mergeIndex = 1;
    let colMaxNumber = Math.floor((h - interval) / (2 * 2 * r)); // 一半视图最多能容纳的点数
    let xLabel = {};
    // 对排序后的数据根据y轴的值进行合并(合并同一个x下相同y值的点)（不包含在openedP中的店）
    for (let i = 1; i < data.length; i++) {
      let temp = data[i];
      // 当前点与merge中的最后一条数据相同，不在展开数组中的顶点被合并
      if (
        openedP.indexOf(`${temp[xAxisType]}_${temp[yAxisType]}`) === -1 &&
        temp[xAxisType] === mergeData[mergeIndex - 1][xAxisType] &&
        temp[yAxisType] === mergeData[mergeIndex - 1][yAxisType]
      ) {
        if (mergeData[mergeIndex - 1]["group"].length === 0) {
          delete mergeData[mergeIndex - 1].group;
          mergeData[mergeIndex - 1] = {
            [xAxisType]: temp[xAxisType],
            [yAxisType]: temp[yAxisType],
            group: [mergeData[mergeIndex - 1], temp],
          };
        } else {
          mergeData[mergeIndex - 1] = {
            [xAxisType]: temp[xAxisType],
            [yAxisType]: temp[yAxisType],
            group: [...mergeData[mergeIndex - 1]["group"], temp],
          };
        }
      } else {
        mergeData[mergeIndex] = { ...temp, group: [] };
        mergeIndex += 1;
      }
    }

    // 计算合并后的数据的x, y
    // xLabel={'score1': [number(y>=avg), number(y<avg), number(prevNeedColumn), number(cur rect width)], 'score2':[...]}
    for (let i of mergeData) {
      if (xLabel.hasOwnProperty(i[xAxisType])) {
        if (i[yAxisType] >= yAvg) {
          xLabel[i[xAxisType]][0] += 1;
        } else {
          xLabel[i[xAxisType]][1] += 1;
        }
      } else {
        xLabel[i[xAxisType]] = [0, 0];
        if (i[yAxisType] >= yAvg) {
          xLabel[i[xAxisType]][0] += 1; // >= 平均数的数量
        } else {
          xLabel[i[xAxisType]][1] += 1;
        }
      }
    }

    let maxWidth = 0; // 记录图表实际使用的宽度
    let columnIndex = 0; // 标识属于第几列的，是累加的
    let prevNeededCol = 0;
    let positiveNumber = 0; // 某一个key下面的负数总数
    let negativeNumber = 0; // 某一个key下面的正数总数
    let prevKey = -1;
    let xRectLabel = new Array(xLabel.length),
      xRectIndex = 0;

    for (let i = 0; i < mergeData.length; i++) {
      let curKey = mergeData[i][xAxisType]; // 当前key
      if (i === 0) {
        // 第一个元素
        columnIndex = 1;
        positiveNumber = 0;
        negativeNumber = 0;
        prevKey = mergeData[i][xAxisType];
        prevNeededCol = Math.ceil(
          d3.max([
            xLabel[mergeData[i][xAxisType]][0],
            xLabel[mergeData[i][xAxisType]][1],
          ]) / colMaxNumber
        ); // 当前的横坐标值需要的列数
        xRectLabel[0] = [];
        xRectLabel[0].push(0); // 第一个起点是0
        xRectLabel[0].push(prevNeededCol); // 第一个需要的宽度
      }

      if (curKey === prevKey) {
        if (mergeData[i][yAxisType] >= yAvg) {
          positiveNumber += 1;
        } else {
          negativeNumber += 1;
        }
      } else {
        xRectIndex += 1;
        columnIndex += prevNeededCol; // 已经使用了的列数
        // 重新初始化一些参数
        prevNeededCol = Math.ceil(
          d3.max([
            xLabel[mergeData[i][xAxisType]][0],
            xLabel[mergeData[i][xAxisType]][1],
          ]) / colMaxNumber
        ); // 当前的横坐标值需要的列数
        xRectLabel[xRectIndex] = [];
        xRectLabel[xRectIndex].push(columnIndex - 1);
        xRectLabel[xRectIndex].push(prevNeededCol);
        positiveNumber = 0;
        negativeNumber = 0;
        prevKey = curKey;

        if (mergeData[i][yAxisType] >= yAvg) {
          positiveNumber += 1;
        } else {
          negativeNumber += 1;
        }
      }

      let c = 0,
        row = 0,
        XvalIndex;
      if (mergeData[i][yAxisType] >= yAvg) {
        XvalIndex = 0;
        if (positiveNumber % colMaxNumber === 0) {
          c = colMaxNumber;
        } else {
          c = positiveNumber % colMaxNumber;
        }
        mergeData[i]["y"] = h / 2 - r * (2 * c - 1) - interval / 2; // 当前点的y值，上方的点整体向上移动一格
      } else {
        XvalIndex = 1;
        if (negativeNumber % colMaxNumber === 0) {
          c = colMaxNumber;
        } else {
          c = negativeNumber % colMaxNumber;
        }
        mergeData[i]["y"] = h / 2 + r * (2 * c - 1) + interval / 2; // 当前点的y值，下方的点整体向下移动一格
      }
      // 点的x值
      let t = [positiveNumber, negativeNumber];
      if (t[XvalIndex] % colMaxNumber === 0) {
        row = t[XvalIndex] / colMaxNumber - 1;
      } else {
        row = Math.floor(t[XvalIndex] / colMaxNumber);
      }
      mergeData[i]["x"] = r * ((columnIndex + row) * 2 - 1); // 当前点的x值

      if (i === mergeData.length - 1) {
        maxWidth = mergeData[i]["x"];
      }
    }
    return [mergeData, maxWidth, xRectLabel];
  }

  // 现根据x轴属性升序排序，再根据y轴属性升序排序
  function multiRuleSort(a, b) {
    if (a[xAxisType] === b[xAxisType]) {
      if (a[yAxisType] > b[yAxisType]) {
        return 1;
      } else {
        return -1;
      }
    } else if (a[xAxisType] > b[xAxisType]) {
      return 1;
    }
    return -1;
  }

  // 计算y轴的平均值
  function average(array) {
    let sum = 0;
    array.forEach((e) => {
      sum += e[yAxisType];
    });
    return Math.round((sum / array.length) * 100) / 100;
  }

  // 判断当前节点是否是单个节点
  function isSingleNode(d) {
    return d.group.length === 0;
  }

  // 计算每一个线圈的半径
  const calCircleR = (i, maxR, number) => {
    return (number - i) * (maxR / number);
  };

  function onAxisTypeChange(e) {
    setAxisValue(e.target.value);
  }

  const onCheckboxChange = (list) => {
    setCheckedList(list);
  };

  return (
    <>
      <div className="details-chart-title">Cluster Details</div>
      <div
        style={{
          width: "100%",
          height: "93%",
          display: "flex",
          verticalAlign: "center",
        }}
      >
        <SubclusterDetails
          subclusterDt={subclusterDt}
          setClusterDFilter={setClusterDFilter}
        ></SubclusterDetails>
        <div
          id="cluster-details-container"
          style={{ width: "80%", height: "100%", paddingTop: '3px'}}
        >
          <div
            id="cluster-details-type"
            style={{ width: "100%", height: "10%", display: "flex" }}
          >
            <div
              id="cluster-details-legend"
              style={{ width: "45%", height: "100%" }}
            ></div>
            <div
              id="cluster-details-ratio"
              style={{ width: "55%", height: "100%", fontSize: "14px" }}
            >
              <Radio.Group onChange={onAxisTypeChange} value={axisValue}>
                <Radio value={"score-star"}>score-star</Radio>
                <Radio value={"date-score"}>date-score</Radio>
                <Radio value={"date-star"}>date-star</Radio>
              </Radio.Group>
              <CheckboxGroup
                options={checkboxOptions}
                value={checkedList}
                onChange={onCheckboxChange}
              />
              <InputNumber
                min={6}
                max={20}
                size="small"
                value={circleRadius}
                onChange={setCircleRadius}
                style={{
                  marginTop: "5px",
                  width: "50px",
                }}
              />
              <span style={{fontSize: '14px'}}>&nbsp;circle radius &nbsp;</span>
              <span style={{fontSize: '14px'}}>| <b>Topic ID</b>: {selectedTopicId}</span>
            </div>
          </div>
          <div
            id="cluster-details-chart-id"
            className="cluster-details-chart"
            style={{ width: "100%", height: "90%" }}
          >
            <div
              id="cluster-details"
              ref={chartRef}
              style={{ width: "3000px", height: "100%" }}
            ></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(RepoCluster);

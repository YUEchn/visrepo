/* eslint-disable no-loop-func */
import React, { useEffect, useState, useRef } from "react";
import { Avatar, InputNumber, Space, Table, Tabs, Tag, Tooltip, Input } from "antd";
import { UserOutlined, StarOutlined, EyeOutlined, ForkOutlined, GroupOutlined } from "@ant-design/icons";
import Markdown from 'https://esm.sh/react-markdown@9'
import rehypeHighlight from 'rehype-highlight'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import parse from "html-react-parser";
import ReactPrismjs from "@uiw/react-prismjs";
import * as echarts from "echarts";
import * as d3 from "d3";
import d3Cloud from "d3-cloud";
import d3Tip from "d3-tip";
import { Buffer } from "buffer";
import { repoPortraitDt, words } from "../../utils/testData.ts";
import "./index.less";
import { IRes } from "../../utils/type.ts";
import { getSourceCode } from "../../apis/api.ts";
import ScrollImage from "../common/scrollImage.tsx";
import { useForm } from "antd/es/form/Form";
const { Search } = Input;

interface IRepoPortraitProps {
  query?: string;
  basicInfo: {};
  directory: {};
  variablesWordCloud: [];
  recommandRepo: {
    related_owner: [];
    related_contirbutor: [];
    similar_topic: [];
  };
  setSelectedRepoId: (repoId: string) => void;
}
const lineSpacing = 20,
  indentSpacing = lineSpacing / 2,
  rect_width = lineSpacing / 2,
  rect_height = lineSpacing / 2;
var directorySvg = null,
  directoryThumbleSvg = null,
  wordcloudSvg = null;
const RepoPortrait = (props: IRepoPortraitProps) => {
  const {
    query,
    basicInfo,
    directory,
    variablesWordCloud,
    recommandRepo,
    setSelectedRepoId,
  } = {
    ...props,
  };
  // const { query, basicInfo, directory, variablesWordCloud, recommandRepo } = {
  //   ...repoPortraitDt,
  // };
  const maxLOC = directory.maxLOC;
  const [selectedFile, setSelectedFile] = useState(""); // 当前选中查看的文件
  const [minWordcloudLength, setMinWordcloudLength] = useState(1); // 设置变量名的最小长度，只有一个词的往往不具备语义信息
  const [minFrequency, setMinFrequency] = useState(1); // 设置最小出现次数，过滤出现次数少的
    const [selectedFileContent, setSelectedFileContent] = useState(""); // 当前选中查看的文件内容
  const [selectedFileType, setSelectedFileType] = useState("javascript"); // 当前选中查看的文件内容
  const languageRef = useRef();
  const wordCloudRef = useRef();

  useEffect(() => {
    if (JSON.stringify(basicInfo) !== "{}") {
      languageChart(basicInfo.language);
    }
  }, [basicInfo]);

  useEffect(() => {
    // drawWordClouds(variablesWordCloud, minWordcloudLength);
    drawWordsCloud(variablesWordCloud, minWordcloudLength, minFrequency)
  }, [variablesWordCloud, minWordcloudLength, minFrequency]);


  useEffect(() => {
    directoryChart(directory); // 绘制目录树图
    directoryThumbnailChart(directory); // 绘制目录树图的缩略图
  }, [directory]);

  useEffect(() => {
    // 请求特定文件的内容
    if (selectedFile) {
      try {
        getSourceCode(selectedFile, basicInfo.repoId).then((res: IRes) => {
          if (res.ok) {
            console.log("getSourceCode", res.data);
            let byteString = atob(res.data.fileContent);
            let decodedData = byteString.replace(/\\n/g, "\n");
            setSelectedFileContent(decodedData);
          } else {
            console.log("请求出错", res.msg);
          }
        });
      } catch (err) {
        console.log(err);
      }
    }
  }, [selectedFile, basicInfo]);

  // 绘制展示语言的条形图
  const languageChart = (data) => {
    let myChart = echarts.init(languageRef.current);
    let barData = data.sort(function (a, b) {
      return b.lines - a.lines;
    }); // 根据数量多少对数据进行排序

    let barWidth = 3 /* 进度条及进度条radius宽度 */,
      nameWidth = 60 /* 进度条名称宽度 */,
      attaData = [] /* 进度条数据 */,
      attaVal = [] /* 进度条数值 */,
      topName = [] /* 进度条名称 */,
      salvProMax = []; /* 背景条数据 */
    let attackSourcesColor = [
      new echarts.graphic.LinearGradient(0, 1, 1, 1, [
        { offset: 0, color: "#FE9C5A" },
        { offset: 1, color: "#EB3B5A" },
      ]),
      new echarts.graphic.LinearGradient(0, 1, 1, 1, [
        { offset: 0, color: "#FFD14C" },
        { offset: 1, color: "#FA8231" },
      ]),
      new echarts.graphic.LinearGradient(0, 1, 1, 1, [
        { offset: 0, color: "#FFEE96" },
        { offset: 1, color: "#F7B731" },
      ]),
      new echarts.graphic.LinearGradient(0, 1, 1, 1, [
        { offset: 0, color: "#2EC7CF" },
        { offset: 1, color: "#395CFE" },
      ]),
    ];
    // let index = 0;
    for (let i in barData) {
      let itemStyle = {
        color: i > 3 ? attackSourcesColor[3] : attackSourcesColor[i],
      };
      topName[i] = barData[i]["name"];
      attaVal[i] = barData[i]["lines"];
      attaData[i] = {
        value: barData[i]["lines"],
        itemStyle: itemStyle,
      };
      // index += 1;
    }

    /* 该值无具体作用，取进度最大值 * 1.2 */
    //@ts-ignore
    salvProMax = Array(attaVal.length).fill(Math.max(...attaVal) * 1.2);
    let option = {
      backgroundColor: "transparent",
      tooltip: {
        show: true,
        backgroundColor: "rgba(1,1,1, 0.1)", //背景颜色（此时为默认色）
        textStyle: {
          fontSize: 10,
        },
      },
      grid: {
        left: "2%",
        right: "2%",
        top: "2%",
        bottom: "2%",
        containLabel: true,
      },
      legend: {
        show: false,
      },
      xAxis: {
        show: false,
      },
      yAxis: [
        {
          //名称
          type: "category",
          inverse: true,
          axisTick: "none",
          axisLine: "none",
          show: true,
          axisLabel: {
            textStyle: {
              color: "#1F4265",
            },
            formatter: (val, i) => {
              return `{name|${val}}`;
            },
            rich: {
              name: {
                width: nameWidth,
                fontSize: 8,
                fontWeight: 600,
              },
            },
          },
          data: topName,
        },
        {
          type: "category",
          inverse: true,
          axisTick: "none",
          axisLine: "none",
          show: true,
          axisLabel: {
            textStyle: {
              color: "#1F4265",
              fontSize: 8,
            },
            formatter: (val) => {
              return val;
            },
          },
          data: attaVal,
        },
      ],
      series: [
        {
          zlevel: 1,
          name: "",
          type: "bar",
          barWidth: barWidth,
          animationDuration: 1500,
          data: attaData,
          align: "center",
          itemStyle: {
            normal: {
              barBorderRadius: barWidth,
            },
          },
          label: {
            show: false,
          },
        },
        // 背景条
        {
          name: "",
          type: "bar",
          barWidth: barWidth,
          barGap: "-100%",
          data: salvProMax,
          itemStyle: {
            normal: {
              barBorderRadius: barWidth,
              color: "rgba(165, 213, 232, 1)",
            },
            emphasis: {
              color: "rgba(165, 213, 232, 1)",
            },
          },
        },
      ],
    };
    myChart.setOption(option, true);
  };

  // 绘制展示文件夹目录的图表
  const directoryChart = (data) => {
    // 绘图前先清空数据
    d3.select("#source-code-directory svg").remove();
    if (JSON.stringify(data) === "{}") return;
    const indentSpacing = 12,
      lineSpacing = 18,
      duration = 300,
      radius = 6, // radius of curve for links
      minHeight = 20,
      // boxSize = 20,
      boxSize = 9.5,
      ease = d3.easeQuadInOut, // https://observablehq.com/@d3/easing-animations
      marginLeft = 20,
      marginRight = 120,
      marginTop = 20,
      marginBottom = 10;
    const heightTH = 2;

    directorySvg = d3
      .select("#source-code-directory")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("background", "none")
      .attr("width", "100%")
      .attr("height", "100%");

    let plus = {
      shapeFill: "black",
      shapeStroke: "black",
      textFill: "white",
      text: "+",
    };
    let minus = {
      shapeFill: "white",
      shapeStroke: "black",
      textFill: "black",
      text: "−",
    };

    let tree = d3.tree().nodeSize([lineSpacing, indentSpacing]);
    let root = d3.hierarchy(data);
    root.x0 = 0;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.data.name.length !== 7) d.children = null; // 初始情况下使得一些节点展开，一些节点折叠
    });

    let index = -1;
    root.eachBefore(function (n) {
      ++index;
    });
    // @ts-ignore
    const gLink = directorySvg
      .append("g")
      .attr("class", "direWrapper")
      .attr("fill", "none")
      .attr("stroke", "#AAA")
      .attr("stroke-width", 0.75)
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // @ts-ignore
    const gNode = directorySvg
      .append("g")
      .attr("class", "direWrapper")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all")
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    let indexLast;
    function update(source) {
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout.
      tree(root);

      // node position function
      index = -1;
      root.eachBefore(function (n) {
        n.x = ++index * lineSpacing;
        n.y = n.depth * indentSpacing;
      });

      const height = Math.max(
        minHeight,
        index * lineSpacing + marginTop + marginBottom
      );

      // @ts-ignore
      directorySvg
        .transition()
        .delay(indexLast < index ? 0 : duration)
        .duration(0);
      // .attr("viewBox", [-marginLeft, -marginTop, width, height]);

      // Update the nodes…
      const node = gNode.selectAll(".direWrapper").data(nodes, (d) => d.id);

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "direWrapper")
        .attr("transform", (d) => `translate(${d.y},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .attr("file-dir", (d) => d.data.fileDir)
        .on("click", function (event, d, i) {
          d.children = d.children ? null : d._children;
          wordcloudSvg.selectAll('.text-function,.text-var').classed('directory-text-selected', false)
          // 点击的是叶子节点
          if (!d.data.children) {
            setSelectedFile(d.data.fileDir); // 设置当前选中的文件的路径
            let houzhui = d.data.fileDir.split(".");
            if (houzhui.length > 1) {
              setSelectedFileType(houzhui[houzhui.length - 1]);
            } else {
              setSelectedFileType("javascript"); // 默认以js格式展示
            }

            // 对当前文件内的函数名和变量名进行高亮显示
            let filDir = d.data.fileDir;
            let function_text = wordcloudSvg.selectAll('.text-function').filter(f => {
              let curFilDir = f.filDir;
              // let curFolders = curFilDir.map(folder => folder.split('/')).flat()
              if (curFilDir.includes(filDir)) return true
              return false
            })
            function_text.classed('directory-text-selected', true)
            
            let var_text = wordcloudSvg.selectAll('.text-var').filter(f => {
              let curFilDir = f.filDir;
              // let curFolders = curFilDir.map(folder => folder.split('/')).flat()
              if (curFilDir.includes(filDir)) return true
              return false
            })
            var_text.classed('directory-text-selected', true)
          }
          update(d);

          charge
            .attr("fill", (d) =>
              d._children
                ? d.children
                  ? minus.textFill
                  : plus.textFill
                : "none"
            )
            .text((d) =>
              d._children ? (d.children ? minus.text : plus.text) : ""
            );

          box.attr("fill", (d) =>
            d._children
              ? d.children
                ? minus.shapeFill
                : plus.shapeFill
              : "none"
          );
        })
        .on("mouseover", function (event, d, i) {
          let targetDir = d3.select(this).attr("file-dir");
          directoryThumbleSvg
            .select(`rect[file-dir='${targetDir}']`)
            .style("fill", "red");
        })
        .on("mouseout", function () {
          let targetDir = d3.select(this).attr("file-dir");
          const thumblenail = directoryThumbleSvg.selectAll(
            `[file-dir='${targetDir}']`
          );          
          if (!thumblenail.empty()) {
            if(d3.select(thumblenail._groups[0][0]).attr('isSelected') === 'false'){
              let curFileType = thumblenail.datum().data;
              if (curFileType.hasOwnProperty("children")) {
                thumblenail.style("fill", "#fedb00");
              } else {
                let colorRatio = curFileType.value / data.maxLOC;
                thumblenail.style("fill", `rgba(5, 120, 209, ${colorRatio})`);
              }
            }
          }
        });

      // 映射表示代码行数的矩形高度比例尺
      const LOCScale = d3
        .scaleLinear()
        // .domain([0, data.maxLOC])
        .domain([0, 1])
        .range([0, boxSize]);
      nodeEnter
        .filter((d) => !d._children)
        .append("rect")
        .attr("x", boxSize / 2)
        .attr("y", (d) => {
          let h = LOCScale(
            (d.data.value - data.minLOC) / (data.maxLOC - data.minLOC)
          );
          // h = h < heightTH ? heightTH : h;
          return boxSize / 2 - h;
        })
        .attr("width", boxSize / 2)
        .attr("height", (d) => {
          let h = LOCScale(
            (d.data.value - data.minLOC) / (data.maxLOC - data.minLOC)
          );
          // h = h < heightTH ? heightTH : h;  // 高度与代码行成正比
          return h;
        })
        .attr("fill", (d) => {
          let h = LOCScale(
            (d.data.value - data.minLOC) / (data.maxLOC - data.minLOC)
          );
          if (h < heightTH) return "#4b97c9";  // 黄色表示当前文件的代码行小于色彩
          return "#4b97c9";
        });

      // check box
      let box = nodeEnter
        .filter((d) => d._children) // 返回有子节点的节点
        .append("rect")
        .attr("width", boxSize)
        .attr("height", boxSize)
        .attr("x", -boxSize / 2)
        .attr("y", -boxSize / 2)
        .attr("fill", (d) => (d.children ? minus.shapeFill : plus.shapeFill))
        .attr("stroke", (d) => (d._children ? "black" : "none"))
        .attr("stroke-width", 0.5);

      // 折叠展开标识符： + -
      let charge = nodeEnter
        .filter((d) => d._children) // 返回有子节点的节点
        .append("text")
        .attr("x", 0)
        .attr("dy", "-0.08em")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .attr("fill", (d) =>
          d._children ? (d.children ? minus.textFill : plus.textFill) : "none"
        )
        .text((d) => (d.children ? "−" : "+"));

      // 标签文本
      let label = nodeEnter
        .append("text")
        .attr("x", 5 + boxSize / 2)
        .attr("text-anchor", "start")
        .attr("dy", "0.32em")
        .text((d) => d.data.name);

      // 文件夹内节点信息
      var dirInfoW = 3;
      nodeEnter
        .filter((d) => d._children)
        .append("g")
        .attr("transform", function (d) {
          let w = d3
            .select(this.previousSibling)
            .node()
            .getComputedTextLength();
          let x = 12 + Math.ceil(w);
          return `translate(${x}, 0)`;
        })
        .selectAll("rect")
        .data((d) => d.data.dirDt)
        .join("rect")
        .attr("x", (dd, i) => i * (dirInfoW + 0.5))
        .attr("y", (dd) => {
          if (dd < 0) return boxSize / 2 - LOCScale(1);
          let h = LOCScale((dd - data.minLOC) / (data.maxLOC - data.minLOC));
          // h = h < heightTH ? heightTH : h;
          return boxSize / 2 - h;
        })
        .attr("width", dirInfoW)
        .attr("height", (dd) => {
          if (dd < 0) return LOCScale(1);
          let h = LOCScale((dd - data.minLOC) / (data.maxLOC - data.minLOC));
          // h = h < heightTH ? heightTH : h;
          return h;
        })
        .attr("fill", (dd) => {
          if (dd < 0) return "#ffd458";  // #da3275
          let h = LOCScale((dd - data.minLOC) / (data.maxLOC - data.minLOC));
          if (h < heightTH) return "#4b97c9";
          return "#4b97c9";
        });

      // Transition nodes to their new position.
      const nodeUpdate = node
        .merge(nodeEnter)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      const nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .ease(ease)
        .remove()
        .attr("transform", (d) => `translate(${d.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      // Update the links…
      const link = gLink.selectAll("path").data(links, (d) => d.target.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link
        .enter()
        .append("path")
        .attr("stroke-opacity", 0)
        .attr("d", (d) =>
          makeLink(
            [d.source.y, source.x],
            [d.target.y + (d.target._children ? 0 : boxSize / 2), source.x],
            radius
          )
        );

      // Transition links to their new position.
      link
        .merge(linkEnter)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr("stroke-opacity", 1)
        .attr("d", (d) =>
          makeLink(
            [d.source.y, d.source.x],
            [d.target.y + (d.target._children ? 0 : boxSize / 2), d.target.x],
            radius
          )
        );

      // Transition exiting nodes to the parent's new position.
      link
        .exit()
        .transition()
        .duration(duration)
        .ease(ease)
        .remove()
        .attr("stroke-opacity", 0)
        .attr("d", (d) =>
          makeLink(
            [d.source.y, source.x],
            [d.target.y + (d.target._children ? 0 : boxSize / 2), source.x],
            radius
          )
        );

      // Stash the old positions for transition.
      root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      indexLast = index; // to know if viewbox is expanding or contracting
    }

    update(root);

    function makeLink(start, end, radius) {
      const path = d3.path();
      const dh = (4 / 3) * Math.tan(Math.PI / 8); // tangent handle offset

      //flip curve
      let fx, fy;
      if (end[0] - start[0] == 0) {
        fx = 0;
      } else if (end[0] - start[0] > 0) {
        fx = 1;
      } else {
        fx = -1;
      }
      if (end[1] - start[1] == 0) {
        fy = 0;
      } else if (end[1] - start[1] > 0) {
        fy = 1;
      } else {
        fy = -1;
      }

      //scale curve when dx or dy is less than the radius
      if (radius == 0) {
        fx = 0;
        fy = 0;
      } else {
        fx *= Math.min(Math.abs(start[0] - end[0]), radius) / radius;
        fy *= Math.min(Math.abs(start[1] - end[1]), radius) / radius;
      }

      path.moveTo(...start);
      path.lineTo(...[start[0], end[1] - fy * radius]);
      path.bezierCurveTo(
        ...[start[0], end[1] + fy * radius * (dh - 1)],
        ...[start[0] + fx * radius * (1 - dh), end[1]],
        ...[start[0] + fx * radius, end[1]]
      );
      path.lineTo(...end);
      return path;
    }
  };

  // 绘制文件夹层级结构的缩略图
  const directoryThumbnailChart = (data) => {
    d3.select("#source-code-directory-thumbnail svg").remove();
    if (JSON.stringify(data) === "{}") return;
    const margin = { top: 20, right: 2, bottom: 1, left: 5 };
    const width = 500,
      height = 1000;
    directoryThumbleSvg = d3
      .select("#source-code-directory-thumbnail")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("width", width)
      .attr("height", height);

    // @ts-ignore
    const wrapperG = directoryThumbleSvg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 创建一个树形布局
    const treeLayout = d3
      .tree()
      .size([
        width - margin.left - margin.right,
        height - margin.top - margin.bottom,
      ])
      .nodeSize([lineSpacing, indentSpacing]);

    // 将数据转换为层次结构
    const root = d3.hierarchy(data);

    // 使用树形布局生成节点和链接
    const treeData = treeLayout(root);
    // node position function
    let index = -1;
    root.eachBefore(function (n) {
      n.x = index++ * lineSpacing;
      n.y = n.depth * indentSpacing;
    });

    // 绘制节点
    const nodes = wrapperG
      .selectAll("g.thumbleG")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "thumbleG")
      .attr("transform", (d) => `translate(${d.y},${d.x / 2})`);

    // 统一绘制矩形
    nodes
      .append("rect")
      .attr("width", rect_width - 1)
      .attr("height", rect_height - 1)
      .attr("file-dir", (d) => d.data.fileDir)
      .attr("class", "directory-thumblenail")
      .attr("isSelected", "false")
      .attr("fill", (d) => {
        if (d.data.hasOwnProperty("children")) return `#ffd458`; // 是文件夹
        let colorRatio = d.data.value / data.maxLOC;
        return `rgba(5, 120, 209, ${colorRatio})`;
      })
      .attr("stroke", (d) => {
        if (d.data.hasOwnProperty("children")) return `#ffd458`; // 是文件夹
        return `rgba(5, 120, 209, 1)`;
      })
      .attr("stroke-width", 0.1);
  };

  // 绘制函数名和变量名的词云图
  const drawWordClouds = (data, minWordcloudLength) => {
    d3.select("#variables-wordcloud svg").remove();

    if (data.length === 0) return;

    data = data.filter((d) => d.text.length >= minWordcloudLength); // 根据单词的长度进行过滤

    const fontFamily = "Verdana, Arial, Helvetica, sans-serif";

    const margin = { top: 1, right: 10, bottom: 1, left: 10 };
    const width = Math.floor(wordCloudRef.current.offsetWidth); // 初始化
    const height = Math.floor(wordCloudRef.current.offsetHeight);
    wordcloudSvg = d3
      .select("#variables-wordcloud")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", [-margin.left, -margin.top, width, height])
      .attr("font-family", fontFamily)
      .attr("text-anchor", "middle");

    const s = d3
      .scaleSqrt()
      .domain([1, d3.max(data.map((d) => d.value))])
      .range([
        12,
        Math.round(
          (3 * width) /
            d3.max(data.map((d) => Math.sqrt(d.value) * d.text.length))
        ) || 40,
      ]); // 自定义值域

    console.log(
      1111,
      data,
      data.map((d) => Math.sqrt(d.value) * d.text.length)
    );

    const cloud = d3Cloud()
      .size([width, height])
      .words(data.map((d) => Object.create(d)))
      .padding(0)
      .rotate(() => 0)
      .font(fontFamily)
      .fontSize((d) => s(d.value))
      .on("word", ({ size, x, y, rotate, text, files, type, merge }) => {
        //@ts-ignore
        wordcloudSvg
          .append("text")
          .attr("font-size", size)
          .attr("file-dir", (d) => files.join("$"))
          .attr("show-line", false)
          .attr("transform", `translate(${x},${y}) rotate(${rotate})`)
          .text(text)
          .attr("fill", () => (type === "variable" ? "orange" : "cadetblue"))
          .classed("click-only-text", true)
          .classed("word-default", true)
          .on("mouseover", handleMouseOver)
          .on("mouseout", handleMouseOut)
          .on("click", function (event, d) {
            const originalThis = this; // 保存原始的 this
            handleClick(originalThis, text, type, merge)(event, d);
          });

        function handleMouseOver(d, i) {
          d3.select(this)
            .classed("word-hovered", true)
            .transition(`mouseover-${text}`)
            .duration(200)
            .ease(d3.easeLinear)
            .attr("font-size", size + 2)
            .attr("font-weight", "bold");
        }

        function handleMouseOut(d, i) {
          d3.select(this)
            .classed("word-hovered", false)
            .interrupt(`mouseover-${text}`)
            .attr("font-size", size);
        }

        function handleClick(originalThis, text, type, merge) {
          return function () {
            var e = d3.select(originalThis);
            e.classed("word-selected", !e.classed("word-selected"));
            e.classed("word-hovered", false);
            //@ts-ignore
            set(wordcloudSvg.node(), e.text());

            ////////////// 在点击的文本和缩略图之间添加曲线
            const tempSvg = d3.select("#conntection-svg"); // 绘制线条的通用svg
            const wordcloudPieSvg = d3.select("#word-pie-svg"); // 绘制饼图的通用svg
            wordcloudPieSvg.selectAll(".wordcloud-pie-g").remove(); // 不管有没有，先移除词云的背景饼图的容器===

            const files_arr = d3
              .select(originalThis)
              .attr("file-dir")
              .split("$");
            let selectSQL = files_arr.reduce((p, f, i) => {
              // 查询对应缩略图矩形的条件
              let comma = ", ";
              if (i === files_arr.length - 1) {
                comma = "";
              }
              return p + `rect[file-dir='${f}']${comma}`;
            }, "");

            let showLine = e.attr("show-line");
            if (showLine === "false") {
              // 需要绘制出线条
              // 当前点的路径
              let startPoint = d3.select(originalThis).attr("transform");
              // 使用正则表达式解析 transform 属性值中的坐标值
              const translateValues = /translate\(([^,]+),([^,]+)\)/.exec(
                startPoint
              );
              // 提取解析后的坐标值
              const startPointXY = [
                parseFloat(translateValues[1]),
                parseFloat(translateValues[2]),
              ];
              let endPointsXY = [];
              const targetElements = directoryThumbleSvg.selectAll(selectSQL);
              targetElements.style("fill", "red");
              targetElements.attr('isSelected', 'true');

              targetElements._groups[0].forEach((rect) => {
                let parentTransform = d3
                  .select(rect)
                  .node()
                  .parentNode.getAttribute("transform");
                let tempPosition = /translate\(([^,]+),([^,]+)\)/.exec(
                  parentTransform
                );
                endPointsXY.push([
                  parseFloat(tempPosition[1]),
                  parseFloat(tempPosition[2]),
                ]);
              });

              // 在文档中绘制线条
              // 创建线段生成器
              const lineGenerator = d3
                .line()
                .x((d) => d.x)
                .y((d) => d.y)
                .curve(d3.curveBasis); // 使用 B 样条曲线
              endPointsXY.forEach((p) => {
                // 绘制贝塞尔曲线 中间的点用来控制曲线
                const pathData = `M${startPointXY[0]},${startPointXY[1]} Q${
                  startPointXY[0] +
                  (p[0] + 300 + rect_width - startPointXY[0]) / 2
                },${p[1] + 10 + rect_height / 2 - 50} ${
                  p[0] + 300 + rect_width
                },${p[1] + 10 + rect_height / 2}`;

                tempSvg
                  .append("path")
                  .attr("d", pathData)
                  .attr("stroke", "#aaa")
                  .attr("stroke-width", 1)
                  .attr("wordcloud", e.text())
                  .attr("fill", "none");
              });
              e.attr("show-line", "true");

              // 在当前位置添加背景云，表示当前词语的其他合并词，暂时不画 效果不好
              if (0) {
                // 在饼图容器中生成饼图
                var pieChart = d3
                  .pie()
                  .padAngle(0.01)
                  .sort(null)
                  .value((d) => d);
                const arcs = pieChart(new Array(merge.length).fill(1));
                wordcloudPieSvg.style("z-index", 1);

                const wordcloudPieG = wordcloudPieSvg
                  .append("g")
                  .attr("class", "wordcloud-pie-g")
                  .attr(
                    "transform",
                    `translate(${startPointXY[0]}, ${startPointXY[1]})`
                  )
                  .on("dblclick", function (e, d) {
                    wordcloudPieSvg.style("z-index", -1);
                  });

                wordcloudPieG
                  .selectAll(".wordcloud-pie")
                  .data(arcs)
                  .enter()
                  .append("path")
                  .attr("class", "wordcloud-pie")
                  .attr("d", d3.arc().innerRadius(0).outerRadius(50))
                  .attr("fill", function (d) {
                    return "red";
                  }) // 假设 color 是你定义的颜色比例尺
                  .attr("stroke", "white")
                  .style("stroke-width", "2px");

                wordcloudPieG
                  .append("text")
                  .text(text)
                  .attr("text-anchor", "middle")
                  .classed("word-selected", true)
                  .attr("fill", () =>
                    type === "variable" ? "orange" : "cadetblue"
                  );

                // 添加饼图元素
                // wordcloudPieSvg.style("z-index", 1);
              }
            } else {
              // 隐藏对应点的线条和取消高亮
              tempSvg.selectAll(`[wordcloud=${e.text()}]`).remove();
              const thumblenailElements =
                directoryThumbleSvg.selectAll(selectSQL);
              if (!thumblenailElements.empty()) {
                thumblenailElements.attr('isSelected', 'false')
                // 只有文件采用对应的变量名，所以不判断是否是文件夹，文件夹的fileDir属性为空[]
                thumblenailElements._groups[0].forEach((thumblenail) => {
                  let obj = d3.select(thumblenail);
                  let curFileType = obj.datum().data;
                  let colorRatio = curFileType.value / maxLOC;
                  obj.style("fill", `rgba(5, 120, 209, ${colorRatio})`);
                });
              }
              e.attr("show-line", "false");
            }
          };
        }
      });

    cloud.start();

    function set(input, value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true })); // Native events bubble, so we should too
    }
  };

  // 绘制文件夹名、文件名、函数名、变量名的词云图，至少长度为1，至少出现一次
  const drawWordsCloud = (data, minLength = 1, minFrequency = 1) =>{
  //   data = {
  //     "file": [
  //         {
  //             "filDir": [
  //                 "src/components/button/Buttons.js"
  //             ],
  //             "name": "Buttons.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/geocoder/geocoder.js"
  //             ],
  //             "name": "geocoder.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/marker/mapMarker.js"
  //             ],
  //             "name": "mapMarker.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/popup/mapPopup.js"
  //             ],
  //             "name": "mapPopup.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/app/app.js"
  //             ],
  //             "name": "app.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/map/MainMap.js"
  //             ],
  //             "name": "MainMap.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/utilityPanel/utilityPanel.js"
  //             ],
  //             "name": "utilityPanel.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/pages/index.js"
  //             ],
  //             "name": "index.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/utils/atoms.js"
  //             ],
  //             "name": "atoms.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js"
  //             ],
  //             "name": "webpack.config.js",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "webpack.prod.config.js",
  //             "value": 1
  //         }
  //     ],
  //     "folder": [
  //         {
  //             "filDir": [
  //                 "src/"
  //             ],
  //             "name": "src",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/assets/"
  //             ],
  //             "name": "assets",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/"
  //             ],
  //             "name": "components",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/button/"
  //             ],
  //             "name": "button",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/geocoder/"
  //             ],
  //             "name": "geocoder",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/marker/"
  //             ],
  //             "name": "marker",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/components/popup/"
  //             ],
  //             "name": "popup",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/"
  //             ],
  //             "name": "layouts",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/app/"
  //             ],
  //             "name": "app",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/map/"
  //             ],
  //             "name": "map",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/layouts/utilityPanel/"
  //             ],
  //             "name": "utilityPanel",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/pages/"
  //             ],
  //             "name": "pages",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "src/utils/"
  //             ],
  //             "name": "utils",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "static/"
  //             ],
  //             "name": "static",
  //             "value": 1
  //         }
  //     ],
  //     "function": [
  //         {
  //           name: "MapMarker",
  //           filDir: [
  //             "src/components/marker/mapMarker.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "GeocoderControl",
  //           filDir: [
  //             "src/components/geocoder/geocoder.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "noop ",
  //           filDir: [
  //             "src/components/geocoder/geocoder.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "UtilityButton",
  //           filDir: [
  //             " src/components/button/Buttons.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "MapPopup",
  //           filDir: [
  //             "src/components/popup/mapPopup.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "getAQI ",
  //           filDir: [
  //             "src/components/popup/mapPopup.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "addMarker",
  //           filDir: [
  //             "src/layouts/map/MainMap.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "UtilityPanel",
  //           filDir: [
  //             "src/layouts/utilityPanel/utilityPanel.js",
  //           ],
  //           value: 1,
  //         },
  //         {
  //           name: "MainMap",
  //           filDir: [
  //             "src/layouts/map/MainMap.js",
  //           ],
  //           value: 1,
  //         },
  //       ],
  //     "var": [
  //         {
  //             name: "InitialRun",
  //             filDir: [
  //               "src/utils/atoms.js",
  //             ],
  //             value: 1,
  //           },
  //           {
  //             name: "Theme",
  //             filDir: [
  //               "src/utils/atoms.js",
  //             ],
  //             value: 1,
  //           },
  //           {
  //             name: "MapLoaded",
  //             filDir: [
  //               "src/utils/atoms.js",
  //             ],
  //             value: 1,
  //           },
  //           {
  //             name: "MapMarkers",
  //             filDir: [
  //               "src/utils/atoms.js",
  //             ],
  //             value: 1,
  //           },
  //         {
  //             "filDir": [
  //                 "webpack.config.js",
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "path",
  //             "value": 2
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js",
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "HtmlWebpackPlugin",
  //             "value": 2
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js"
  //             ],
  //             "name": "BundleAnalyzerPlugin",
  //             "value": 1
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js",
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "FaviconsWebpackPlugin",
  //             "value": 2
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js",
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "webpack",
  //             "value": 2
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js",
  //                 "webpack.prod.config.js"
  //             ],
  //             "name": "CompressionPlugin",
  //             "value": 2
  //         },
  //         {
  //             "filDir": [
  //                 "webpack.config.js"
  //             ],
  //             "name": "ReactRefreshWebpackPlugin",
  //             "value": 1
  //         }
  //     ]
  // }
    d3.select("#variables-wordcloud svg").remove();
    if (data.length === 0) return;

    const width = Math.floor(wordCloudRef.current.offsetWidth) - 5; // 初始化
    const fontFamily = "Verdana, Arial, Helvetica, sans-serif";

    wordcloudSvg = d3
      .select("#variables-wordcloud")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("font-family", fontFamily)

      const tip = d3Tip()
      .attr("class", "d3-tip")
      .html(function (e, d) {
        let htr = `${d.name}: ${d.value}`;
        return htr;
      });
      wordcloudSvg.call(tip)

    // 文本高度
    const textHeight = 20;
    // 文本宽度
    const textWidth = 9;
    // 保存上一个类别的高度
    let preHeight = textHeight;
    let margin = 10, rectWidth = 3;
    const text_class_type = {
      'folder': 'text-folders',
      'file': 'text-file',
      'function': 'text-function',
      'var': 'text-var',
    }
    
    const selected_class_type = {
      'folder': 'folder-selected',
      'file': 'file-selected',
      'function': 'function-selected',
      'var': 'var-selected',
    }

    wordcloudSvg.style("height", 1000);
    let key_type = ['folder', 'file', 'function', 'var']
    for(const key of key_type){
      
    // for(const [key, values] of Object.entries(data)){
      let values = data[key];
      let filteredValue = values;

      if(['var', 'function'].includes(key)){
        filteredValue = values?.filter(v => v['name']?.length >= minLength && v['value'] >= minFrequency)
      }
      const scale = d3.scaleLinear().domain([0, d3.max(filteredValue.map(d=>d.value))]).range([0, textHeight-3]);
      const group = wordcloudSvg.append('g');
      group.attr('transform', `translate(${0}, ${preHeight})`)
      group.append('text').text(key+": ").attr('transform', `translate(5,  -5)`).attr('class', 'text-type-title')

      // 组内高度 宽度
      let innerHeight = 0;
      let innerWidth = 20;
      innerHeight += textHeight;
      // 添加文本
      const textWrapper = group.selectAll('.schema')
        .data(filteredValue)
        .join('g')
        .attr('class', 'schema')
        .attr('transform', (d, i)=>{
          if(innerWidth+d.name.length*textWidth > width){
            innerHeight += textHeight + 4;
            innerWidth = 20;
            let str =`translate(${innerWidth}, ${innerHeight})`;
            
            innerWidth += d.name.length*textWidth+margin;
            return str
          }else{
            const str = `translate(${innerWidth}, ${innerHeight})`
            innerWidth += d.name.length*textWidth+margin
            return str;
          }
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)

        textWrapper.append('text')
        .text((d)=>d.name)
        .attr('x', 5)
        .attr('font-size', '14px')
        .attr('class', text_class_type[key])  // 不同的文本类型添加不同的类
        .style('cursor', 'pointer')
        .on('click', function(e, d){
          let class_type = selected_class_type[key]
          if(d3.select(this).classed(class_type)){  // 移除当前词被选中的状态
            // 取消当前词的高亮
            d3.select(this).classed(class_type, false)

            if(key === 'folder'){  // 当前是文件夹
              // 获取符合的文件
              let files_text = d3.selectAll('.text-file').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              files_text.classed('file-selected', false)
              // 获取符合的函数名
              let function_text = d3.selectAll('.text-function').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              function_text.classed('function-selected', false)
              
              // 获取符合的变量名
              let var_text = d3.selectAll('.text-var').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              var_text.classed('var-selected', false)
            } else if(key === 'file'){  // 当前是文件
              // 获取符合的函数名
              let function_text = d3.selectAll('.text-function').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              function_text.classed('function-selected', false)
              
              // 获取符合的变量名
              let var_text = d3.selectAll('.text-var').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              var_text.classed('var-selected', false)
            } 
            // else if(key === 'function' || key === 'var'){  // 是函数名或者变量名，则只在缩略图中取消显示对应的文件夹
              const files_arr = d.filDir;
              let selectSQL = files_arr.reduce((p, f, i) => {
              // 查询对应缩略图矩形的条件
              let comma = ", ";
              if (i === files_arr.length - 1) {
                comma = "";
              }
              return p + `rect[file-dir='${f}']${comma}`;
            }, "");

            const thumblenailElements = directoryThumbleSvg.selectAll(selectSQL);
            
            if (!thumblenailElements.empty()) {
              thumblenailElements.attr('isSelected', 'false')
              // 只有文件采用对应的变量名，所以不判断是否是文件夹，文件夹的fileDir属性为空[]
              thumblenailElements._groups[0].forEach((thumblenail) => {
                let obj = d3.select(thumblenail);
                let curFileType = obj.datum().data;
                let colorRatio = curFileType.value / maxLOC;
                if(Number.isNaN(colorRatio)){  // 当前是文件夹
                  obj.style("fill", `#ffd458`);
                } else{
                  obj.style("fill", `rgba(5, 120, 209, ${colorRatio})`);
                }
              });
            }
            // }

          } else{
            d3.select(this).classed(class_type, true)
            if(key === 'folder'){  // 当前是文件夹
              // 获取符合的文件
              let files_text = d3.selectAll('.text-file').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              files_text.classed('file-selected', true)
              // 获取符合的函数名
              let function_text = d3.selectAll('.text-function').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              function_text.classed('function-selected', true)
              
              // 获取符合的变量名
              let var_text = d3.selectAll('.text-var').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              var_text.classed('var-selected', true)
            } else if(key === 'file'){  // 当前是文件
              // 获取符合的函数名
              let function_text = d3.selectAll('.text-function').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              function_text.classed('function-selected', true)
              
              // 获取符合的变量名
              let var_text = d3.selectAll('.text-var').filter(f => {
                let curFilDir = f.filDir;
                let curFolders = curFilDir.map(folder => folder.split('/')).flat()
                if (curFolders.includes(d.name)) return true
                return false
              })
              var_text.classed('var-selected', true)
            } 
            // else if(key === 'function' || key === 'var'){  // 是函数名或者变量名，则只在缩略图中取消显示对应的文件夹
              const files_arr = d.filDir;
              let selectSQL = files_arr.reduce((p, f, i) => {
              // 查询对应缩略图矩形的条件
              let comma = ", ";
              if (i === files_arr.length - 1) {
                comma = "";
              }
              return p + `rect[file-dir='${f}']${comma}`;
            }, "");
              const targetElements = directoryThumbleSvg.selectAll(selectSQL);
              targetElements.style("fill", "red");
              targetElements.attr('isSelected', 'true');
            // }
          }
        })
        // 添加柱子
        textWrapper.append('rect')
          .attr('x',0)
          .attr('y', d => -scale(d.value))
          .attr('width', rectWidth)
          .attr('height', d => scale(d.value))
          .style('fill',"#ef9c66");
        innerHeight += textHeight;
        preHeight += innerHeight;
        wordcloudSvg.style("height", preHeight)
        preHeight += 10;
    }
  }

  const onFileSearch = (value, e, info) => {
    console.log('searching file!');
    
  }

  const IconText = ({ icon, text }) => (
    <Space>
      {icon}
      {text}
    </Space>
  );

  // 展示相似或者相关的仓库列表
  function ConnectedRepo({ tagType }) {
    const columns = [
      {
        title: "RepoName",
        dataIndex: "repoName",
        render: (text) => (
          <div style={{ display: "flex", alignItems: "center" }}>
            <ScrollImage width={50} height={50} images={text["images"]} />
            <a
              onClick={() => setSelectedRepoId(text["repoName"].split("*")[1])}
            >
              {text["repoName"].split("*")[0]}
            </a>
          </div>
        ),
      },
      {
        title: "Description",
        dataIndex: "description",
        render: (text) => parse(text || ""),
      },
      {
        title: "Tags",
        key: "topics",
        dataIndex: "topics",
        render: (_, { topics }) => (
          <>
            {topics.map((tag) => {
              let color = tag.length > 5 ? "geekblue" : "green";
              if (tag === "loser") {
                color = "volcano";
              }
              return (
                <Tag color={color} key={tag}>
                  {tag}
                </Tag>
              );
            })}
          </>
        ),
      },
      {
        title: "Star",
        key: "star",
        dataIndex: "star",
        width: 100,
        sorter: (a, b) => a.star - b.star,
      },
      {
        title: "Fork",
        key: "fork",
        dataIndex: "fork",
        width: 100,
        sorter: (a, b) => a.fork - b.fork,
      },
      {
        title: "Watch",
        key: "watch",
        dataIndex: "watch",
        width: 100,
        sorter: (a, b) => a.watch - b.watch,
      },
      {
        title: "Topic ID",
        dataIndex: "topic",
        width: 100,
      },
      // {
      //   title: "Size",
      //   dataIndex: "size",
      //   sorter: (a, b) => a.size - b.size,
      // },
    ];
    const tableDt = [];
    for (let i = 0; i < recommandRepo[tagType].length; i++) {
      //@ts-ignore
      tableDt.push({
        key: recommandRepo[tagType][i]["repoId"],
        repoName: {
          images: recommandRepo[tagType][i]["images"],
          repoName:
            recommandRepo[tagType][i]["repoName"] +
            "*" +
            recommandRepo[tagType][i]["repoId"],
        },
        description: recommandRepo[tagType][i]["description"],
        topics: recommandRepo[tagType][i]["topics"],
        star: recommandRepo[tagType][i]["star"],
        fork: recommandRepo[tagType][i]["fork"],
        watch: recommandRepo[tagType][i]["watch"],
        topic: recommandRepo[tagType][i]["topicId"] || '-',
        // size: recommandRepo[tagType][i]["size"],
      });
    }
    return (
      <Table
        size="small"
        columns={columns}
        dataSource={tableDt}
        pagination={{
          pageSize: 50,
        }}
        scroll={{
          y: 100,
        }}
      />
    );
  }

  return (
    <>
      <div className="container-title">Repository Details</div>
      <div className="single-repo-basic-info">
        <div className="repo-info-title">
          {JSON.stringify(basicInfo) === "{}" ? (
            ""
          ) : (
            <>
              <a
                style={{ display: "block", width: "70%" }}
                href={basicInfo?.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                <h2> {basicInfo.repoName} </h2>
              </a>
              <a
                style={{ display: "block", width: "1%" }}
                href={basicInfo.owner.url}
                target="_blank"
                rel="noreferrer"
              >
                <Tooltip
                  title={basicInfo.owner.name.split("_")[1]}
                  placement="left"
                  color="#969696"
                >
                  <Avatar
                    size={"small"}
                    style={
                      basicInfo.owner.type === "User"
                        ? { backgroundColor: "#87d068" }
                        : { backgroundColor: "#ce723b" }
                    }
                    icon={<UserOutlined />}
                  />
                </Tooltip>
              </a>
              <div
                style={{
                  float: "right",
                  width: "10%",
                  display: "flex",
                  marginLeft: "4%",
                }}
              >
                <IconText
                  icon={<GroupOutlined style={{ color: "#c6b945" }} />}
                  text={basicInfo?.topicId || '-'}
                  key="list-vertical-star-o"
                />
                &nbsp;&nbsp;
                <IconText
                  icon={<StarOutlined style={{ color: "#c6b945" }} />}
                  text={basicInfo.star}
                  key="list-vertical-star-o"
                />
                &nbsp;&nbsp;
                <IconText
                  icon={<ForkOutlined  style={{ color: "#557ebd" }} />}
                  text={basicInfo.fork}
                  key="list-vertical-fork-o"
                />
                &nbsp;&nbsp;
                <IconText
                  icon={<EyeOutlined  style={{ color: "#c5e1a5" }} />}
                  text={basicInfo.watch}
                  key="list-vertical-like-o"
                />
              </div>
            </>
          )}
        </div>
        <div className="repo-info-description">
          {JSON.stringify(basicInfo) === "{}" ? (
            ""
          ) : (
            <>
              {basicInfo.highlight.hasOwnProperty("description")
                ? (() => {
                    let description = basicInfo.highlight.description
                      .join(" ")
                      .split(/<em>|<\/em>/);
                    let desc_str = "",
                      query_arr = query.toLowerCase().split(/ +|-/);
                    for (let s of description) {
                      if (s !== "") {
                        let s_index = query_arr.indexOf(s.toLowerCase().trim());
                        if (s_index !== -1) {
                          desc_str += `<b className=match-style${s_index}>${s}</b>`;
                        } else {
                          desc_str += s;
                        }
                      }
                    }
                    return parse(desc_str);
                  })()
                : basicInfo.description || ""}
            </>
          )}
        </div>
        <div className="repo-info-labels">
          {JSON.stringify(basicInfo) === "{}" ? (
            ""
          ) : (
            <>
              <div className="repo-info-tags">
                {!basicInfo.highlight.hasOwnProperty("topics")
                  ? basicInfo.topics.map((topic) => {
                      return (
                        <Tag value={topic.replace(/\-|\_/g, " ").toLowerCase()}>
                          {topic}
                        </Tag>
                      );
                    })
                  : (() => {
                      let htemp: string[] = [];
                      let query_arr = query.toLowerCase().split(/ +|-/);
                      let temp = basicInfo.highlight.topics.map((t) => {
                        let tt = t
                          .replace(/<em>/g, "")
                          .replace(/<\/em>/g, "")
                          .toLowerCase(); // 在highlight中的topic
                        let ttt = "";
                        t.split(/<em>|<\/em>/).forEach((e) => {
                          if (
                            e != "" &&
                            query_arr.indexOf(e.toLowerCase().trim()) != -1
                          ) {
                            ttt += `<b className=match-style${query_arr.indexOf(
                              e.toLowerCase().trim()
                            )}>${e}</b>`;
                          } else {
                            ttt += e;
                          }
                        });
                        htemp.push(ttt);
                        return tt;
                      });
                      let tags = basicInfo.topics.map((topic) => {
                        let s_index = temp?.indexOf(topic.toLowerCase()) || 0;
                        if (s_index !== -1) {
                          return (
                            <Tag
                              value={topic.replace(/-|_/g, " ").toLowerCase()}
                            >
                              {parse(htemp[s_index])}
                            </Tag>
                          );
                        } else {
                          return (
                            <Tag
                              value={topic.replace(/\-|\_/g, " ").toLowerCase()}
                            >
                              {topic}
                            </Tag>
                          );
                        }
                      });
                      return tags;
                    })()}
              </div>
              <div className="repo-info-language" ref={languageRef}></div>
            </>
          )}
        </div>
      </div>
      <div id="source-code-center-id" className="source-code-container">
        <div className="source-code-center">
          <div className="source-code-title">
            <h4>Directory</h4> size: {basicInfo.size || '-'}
          </div>
          <div className="source-code-directory-container">
            <div className="source-code-left">
              <div className="word-length-filter">
                <InputNumber
                  size="small"
                  min={1}
                  defaultValue={minWordcloudLength}
                  onChange={setMinWordcloudLength}
                  style={{
                    marginTop: "5px",
                    marginLeft: "5px",
                    width: "30px",
                  }}
                />
                &nbsp;<span className="span-title"> Min var length</span>&nbsp;&nbsp;&nbsp;&nbsp;
                <InputNumber
                  size="small"
                  min={1}
                  defaultValue={minFrequency}
                  onChange={setMinFrequency}
                  style={{
                    marginTop: "5px",
                    marginLeft: "5px",
                    width: "30px",
                  }}
                />
                &nbsp;<span className="span-title"> Min frequency</span>
              </div>
              <div id="variables-wordcloud" ref={wordCloudRef}></div>
            </div>
            <div className="source-code-direct-left-container">
              <div id="source-code-directory-thumbnail"></div>
            </div>
            <div className="source-code-direct-right-container">
            <Search
              placeholder="Go to file"
              allowClear
              onSearch={onFileSearch}
              style={{ width: '98%', marginLeft: '1%' }}
            />
              <div id="source-code-directory"></div>
            </div>
            <svg
              id="conntection-svg"
              style={{
                position: "absolute",
                width: 400,
                height: "100%",
                zIndex: -2,
              }}
            ></svg>
            <svg
              id="word-pie-svg"
              style={{
                position: "absolute",
                width: 400,
                height: "100%",
                zIndex: -1,
              }}
            ></svg>
          </div>
        </div>
        <div className="source-code-right">
          <div className="source-code-title">
            <h4>&nbsp;&nbsp;Source code:&nbsp;&nbsp; {selectedFile}</h4>
          </div>
          <div className="source-code-container">
            <div id="source-code">
              {
                selectedFile.toLowerCase().indexOf('readme') !== -1? <Markdown 
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={{
                  // Map `h1` (`# heading`) to use `h2`s.
                  h1: 'h2',
                  h2: 'h3',
                  // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
                  em(props) {
                    const {node, ...rest} = props
                    return <i style={{color: 'red'}} {...rest} />
                  },
                  code(props) {
                    const {children, className, node, ...rest} = props
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <SyntaxHighlighter
                        {...rest}
                        PreTag="div"
                        children={String(children).replace(/\n$/, '')}
                        language={match[1]}
                        style={dark}
                      />
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
                >{selectedFileContent}</Markdown>: <ReactPrismjs
                language={"js"}
                // language={selectedFileType}
                source={selectedFileContent}
              />
              }
            </div>
          </div>
        </div>
      </div>

      <div id="connected-repo" style={{width: '100%', paddingRight: '3px'}}>
        <Tabs
          defaultActiveKey="related"
          items={["related_owner", "related_contirbutor", "similar_topic"].map(
            (tagType, i) => {
              return {
                label: (
                  <span>
                    {tagType.split("_")[0] === "related" ? (
                      <>
                        <svg
                          style={{ transform: "translateY(4px)" }}
                          t="1673942435379"
                          className="icon"
                          viewBox="0 0 1024 1024"
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          p-id="2749"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M843.676672 360.486912c-9.746432-4.180992-21.11488-8.476672-32.129024-12.416 2.31424-11.836416 4.406272-23.095296 5.341184-34.265088 11.346944-92.941312-7.656448-165.812224-59.1872-196.67456l-1.869824-1.045504c-52.201472-30.394368-125.31712-10.569728-201.101312 46.058496-9.166848 6.764544-17.977344 14.508032-27.255808 21.9392-9.279488-7.431168-17.980416-15.174656-27.25888-21.9392-74.628096-56.027136-147.2768-75.874304-199.832576-46.748672l-1.512448 0.690176c-52.578304 30.394368-72.070144 103.733248-60.811264 197.71904 1.626112 11.169792 3.115008 22.428672 5.4528 34.265088-11.015168 3.939328-21.940224 8.235008-32.487424 12.416-87.020544 37.024768-140.869632 90.604544-140.869632 151.414784 0 60.923904 53.848064 114.302976 140.869632 151.906304 10.546176 4.048896 21.471232 8.23296 32.487424 12.306432-2.337792 11.370496-3.826688 22.962176-5.4528 33.997824-11.25888 94.009344 8.23296 167.079936 61.034496 197.496832 52.800512 30.640128 125.915136 11.148288 201.122816-46.058496 9.279488-6.740992 17.980416-13.927424 27.25888-21.605376 9.279488 7.677952 18.08896 14.864384 27.255808 21.605376 75.784192 57.206784 148.89984 76.698624 201.101312 46.30528l0-0.24576c52.80256-30.416896 72.403968-103.488512 61.057024-197.496832-0.934912-11.035648-3.026944-22.628352-5.341184-33.997824 11.014144-4.073472 22.382592-8.256512 32.129024-12.306432 87.048192-37.603328 140.89216-90.9824 140.89216-151.906304C984.568832 451.091456 930.724864 397.510656 843.676672 360.486912L843.676672 360.486912zM580.498432 196.9664 580.498432 196.9664c61.27616-46.08 118.017024-64.171008 153.971712-43.276288l0.603136 0.222208c35.489792 21.138432 47.92832 78.789632 38.293504 154.79808-0.6912 8.476672-2.313216 17.288192-3.381248 26.011648-38.872064-10.324992-81.329152-18.802688-126.340096-24.1664-27.057152-36.068352-55.581696-69.020672-83.661824-96.877568C566.56896 207.981568 573.889536 202.084352 580.498432 196.9664L580.498432 196.9664zM347.021312 614.834176 347.021312 614.834176l0.466944 1.045504c10.102784 17.068032 19.848192 32.975872 29.950976 48.953344-29.372416-4.983808-57.00608-11.124736-83.217408-17.980416 6.720512-26.32192 15.218688-53.578752 26.211328-81.435648C328.465408 581.880832 337.519616 598.36928 347.021312 614.834176L347.021312 614.834176zM294.2208 377.4208 294.2208 377.4208c26.211328-7.433216 53.844992-13.351936 83.439616-18.225152-10.324992 15.664128-20.0704 32.132096-30.173184 48.864256-9.521152 16.821248-18.80064 33.753088-27.056128 50.240512C309.439488 430.799872 300.941312 403.163136 294.2208 377.4208L294.2208 377.4208zM342.61504 512.124928 342.61504 512.124928c12.439552-27.035648 26.811392-54.892544 42.47552-82.149376 15.6672-27.61216 32.709632-53.470208 49.998848-77.966336 29.617152-2.916352 60.455936-4.4288 92.386304-4.4288 31.906816 0 62.903296 1.512448 92.494848 4.4288 17.155072 24.496128 34.22208 50.354176 49.887232 77.966336l0.79872 1.045504c15.442944 27.0336 29.372416 54.068224 41.653248 80.879616-12.52352 27.25888-26.65472 54.784-42.697728 82.172928l-0.46592 0.666624c-15.44192 27.300864-32.24064 53.046272-49.174528 77.298688-29.591552 2.557952-60.588032 4.629504-92.494848 4.629504-31.930368 0-62.769152-2.070528-92.386304-4.629504-17.288192-24.475648-34.330624-50.463744-49.998848-77.966336l-0.487424-1.068032C368.847872 565.861376 355.054592 538.602496 342.61504 512.124928L342.61504 512.124928zM706.392064 617.16992 706.392064 617.16992l1.42336-1.291264c9.280512-16.733184 18.424832-33.997824 26.65472-50.46272 10.927104 27.856896 19.627008 55.113728 26.012672 81.435648-25.409536 6.854656-53.736448 12.995584-83.10784 17.980416C687.388672 649.411584 696.891392 633.413632 706.392064 617.16992L706.392064 617.16992zM708.25984 408.859648 708.25984 408.859648l-0.44544-0.799744c-9.877504-16.73216-20.204544-33.199104-30.440448-48.864256 29.372416 4.873216 57.698304 10.791936 83.10784 18.225152-6.385664 25.74336-15.085568 53.379072-26.012672 80.879616C726.240256 442.41408 717.31712 425.570304 708.25984 408.859648L708.25984 408.859648zM527.474688 242.58048 527.474688 242.58048c19.600384 18.557952 38.647808 40.163328 57.20576 63.347712-18.557952-1.624064-37.6064-1.624064-57.20576-1.624064-19.49184 0-38.540288 0-57.428992 1.624064C489.179136 282.743808 508.205056 261.138432 527.474688 242.58048L527.474688 242.58048zM320.431104 153.689088 320.431104 153.689088l1.068032-0.466944c36.535296-19.825664 92.251136-1.84832 152.94976 43.743232 6.720512 5.117952 13.930496 11.016192 20.873216 16.71168-28.54912 27.856896-56.962048 60.81024-84.243456 96.877568-45.011968 5.362688-87.266304 13.841408-125.893632 24.1664-1.73568-8.723456-2.803712-17.536-3.849216-26.011648C272.059392 232.700928 284.474368 174.560256 320.431104 153.689088L320.431104 153.689088zM253.010944 633.413632 253.010944 633.413632c-8.675328-3.383296-17.043456-6.163456-24.695808-9.745408-70.580224-30.396416-114.658304-69.645312-114.658304-111.767552 0-41.76384 44.07808-81.458176 114.658304-111.496192 7.653376-3.381248 16.464896-6.519808 24.695808-10.102784 10.34752 39.205888 24.254464 79.835136 42.276864 121.598976C277.265408 554.023936 263.358464 594.295808 253.010944 633.413632L253.010944 633.413632zM474.44992 826.728448 474.44992 826.728448c-61.27616 46.190592-117.438464 64.171008-154.017792 43.522048-35.95776-20.537344-48.372736-78.456832-39.094272-154.932224 1.045504-8.209408 2.113536-17.289216 3.849216-26.322944 38.627328 10.790912 80.881664 19.136512 125.893632 24.254464 27.281408 36.535296 55.693312 69.511168 84.243456 97.011712C488.379392 816.1792 481.170432 821.874688 474.44992 826.728448L474.44992 826.728448zM527.474688 781.248512 527.474688 781.248512c-19.269632-18.581504-38.295552-39.918592-57.428992-63.371264 18.888704 1.512448 37.936128 2.091008 57.428992 2.091008 19.600384 0 38.647808-0.57856 57.20576-2.091008C566.122496 741.328896 547.075072 762.665984 527.474688 781.248512L527.474688 781.248512zM734.470144 870.250496 734.470144 870.250496c-35.954688 20.64896-92.695552 2.668544-153.971712-43.165696-6.607872-5.209088-13.929472-10.904576-20.514816-16.823296 28.080128-27.500544 56.604672-60.47744 83.661824-97.011712 45.010944-5.116928 87.468032-13.462528 126.340096-24.254464 1.068032 9.033728 2.690048 18.113536 3.381248 26.322944C783.000576 791.79264 770.563072 849.713152 734.470144 870.250496L734.470144 870.250496zM826.744832 623.669248 826.744832 623.669248c-7.76704 3.581952-16.265216 6.362112-24.721408 9.745408-10.10176-39.117824-24.25344-79.389696-42.22976-121.288704 17.977344-41.987072 32.128-82.61632 42.22976-121.822208 8.456192 3.582976 16.954368 6.720512 24.721408 10.102784 70.556672 30.036992 114.302976 69.732352 114.302976 111.496192C941.047808 554.023936 897.301504 593.272832 826.744832 623.669248L826.744832 623.669248z"
                            fill="#231815"
                            p-id="2750"
                          ></path>
                        </svg>
                        &nbsp;{tagType === 'related_contirbutor' ? "related_contributor": tagType}
                      </>
                    ) : (
                      <>
                        <svg
                          style={{ transform: "translateY(4px)" }}
                          t="1673943119057"
                          className="icon"
                          viewBox="0 0 1024 1024"
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          p-id="3312"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M823.854545 800.581818c83.781818-83.781818 134.981818-200.145455 134.981819-330.472727 0-260.654545-209.454545-470.109091-465.454546-470.109091S32.581818 209.454545 32.581818 470.109091s209.454545 470.109091 460.8 470.109091c102.4 0 195.490909-32.581818 274.618182-93.090909l172.218182 176.872727 51.2-51.2-167.563637-172.218182z m-330.472727 65.163637c-214.109091 0-390.981818-176.872727-390.981818-395.636364S279.272727 74.472727 493.381818 74.472727c214.109091 0 390.981818 176.872727 390.981818 395.636364s-176.872727 395.636364-390.981818 395.636364z"
                            p-id="3313"
                          ></path>
                          <path
                            d="M623.709091 577.163636v-279.272727c0-18.618182-13.963636-27.927273-27.927273-27.927273h-279.272727c-18.618182 0-27.927273 13.963636-27.927273 27.927273v274.618182c0 18.618182 13.963636 27.927273 27.927273 27.927273h279.272727c13.963636 4.654545 27.927273-9.309091 27.927273-23.272728z m-60.509091-32.581818H344.436364V330.472727h218.763636v214.109091z"
                            p-id="3314"
                          ></path>
                          <path
                            d="M651.636364 633.018182h-172.218182v60.509091h204.8c18.618182 0 27.927273-13.963636 27.927273-27.927273V456.145455H651.636364v176.872727z"
                            p-id="3315"
                          ></path>
                        </svg>
                        &nbsp;{tagType}
                      </>
                    )}
                  </span>
                ),
                key: tagType,
                children: <ConnectedRepo tagType={tagType} />,
              };
            }
          )}
        />
      </div>
    </>
  );
};

export default React.memo(RepoPortrait);

import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import d3Tip from "d3-tip";
import type { RadioChangeEvent } from "antd";
import {
  Radio,
  Select,
  Slider,
  Tree,
  Input,
  ConfigProvider,
  Button,
  Checkbox,
} from "antd";
import { MinusOutlined, PlusOutlined, DownOutlined } from "@ant-design/icons";
import TopicWordBar from "./topicWordBar.tsx";
import TopicSelection from "./topicSelection.tsx";
import LeaftKeyword from "./LeaftKeyword.tsx";
import { debounce } from "../../utils/tool.ts";
import { IRepoCluster, IRes, IThemeTreeDt } from "../../utils/type.ts";
import "./index.less";
import { deepCopy } from "../../utils/tool.ts";
import RepoCluster from "../repoCluster/index.tsx";
import {
  adjustMinTopicSizeModel,
  getTopicCluster,
} from "../../apis/api.ts";
import {
  topicTreeDt as data,
  searchTopicsDt,
  topicsOverview,
  topicKeywords,
} from "../../utils/testData.ts";
import TopicOverview from "./topicOverview.tsx";

var included_topicIds: string[] = [];
var selected_topic_type = "";
const pieColor = {
  0:  "#7eb1d4"   ,
  1: "#face30",
  2: "#da3174"
}
interface ITopicModelTree {
  data: IThemeTreeDt;
  searchTopicsDt: string[];
  selectedTopicId: string;
  topicsOverview: { [key: string]: any }[];
  setSelectedRepoId: (p) => void;
  setListResultDt: (p) => void;
  setTopicModelTreeDt: (p) => void;
  setSearchTopicsDt: (p) => void;
  setUiLeftDirection: (p) => void;
  setSelectedTopicId: (p) => void;
}

// 这个图要展示出每个节点包含了多少个文档，直接在节点中给出，区分主题的权重
const TopicModelTree = (props: ITopicModelTree) => {
  let {
    // data,
    // searchTopicsDt,
    // topicsOverview,
    setSelectedRepoId,
    setListResultDt,
    setTopicModelTreeDt,
    setSearchTopicsDt,
    setUiLeftDirection,
    selectedTopicId,
    setSelectedTopicId
  } = { ...props };
  const resizeRef = useRef(null);
  const [treeLayout, setTreeLayout] = useState("tree");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // 包含的主题词

  const [chartGapX, setChartGapX] = useState<number>(180); // 设置图的x轴的上节点的间距
  const [chartGapY, setChartGapY] = useState<number>(70); // 设置图的y轴的上节点的间距
  const [minTopicSize, setMinTopicSize] = useState<number>(10); // 主题建模参数调整
  const [topicWordsThreshold, setTopicWordsThreshold] = useState<number>(0.1); // 设置相似主题合并阈值

  // 主题建模cluster细节相关状态
  // const [selectedTopicId, setSelectedTopicId] = useState(""); // 选中的主题
  const [topicWordScope, setTopicWordScope] = useState<string>("all"); // 显示的主题范围：全局 / 叶子节点
  const [topicClusterDt, setTopicClusterDt] = useState<IRepoCluster[]>([]);
  const [showText, setShowText] = useState(true);
  const [topicKeywords, setTopicKeywords] = useState([]);
  const [subclusterDt, setSubclusterDt] = useState({
    languageDt: [],
    techDt: [],
  });
  const [watchMax, setWatchMax] = useState();
  const [forkMax, setForkMax] = useState();

  useEffect(() => {
    drawTopicTree(
      data,
      treeLayout,
      chartGapY,
      selectedTopics,
      topicWordsThreshold,
      showText,
      chartGapX,
      chartGapY
    );
  }, [
    data,
    treeLayout,
    chartGapY,
    selectedTopics,
    topicWordsThreshold,
    showText,
    chartGapX,
    chartGapY
  ]);

  useEffect(() => {
    if (selectedTopicId) {
      // 请求当前主题的数据，为下方的主题集群图请求数据
      try {
        // 请求的速度比我预期的快，不错！👍
        getTopicCluster(
          selectedTopicId,
          included_topicIds,
          selected_topic_type
        ).then((res: IRes) => {
          if (res.ok) {
            console.log('集群图数据', res.data);
            setForkMax(res.data.forkMax);
            setWatchMax(res.data.watchMax);
            setTopicClusterDt(res.data.data);
            setSubclusterDt(res.data.subclassDt);
            setListResultDt({"maxStar": res.data.starMax, "maxWatch": res.data.watchMax, "maxFork": res.data.forkMax, "listDt": res.data.listDt});  //更新列表数据
            if (res.data.topicKeywords.length !== 0) {
              setTopicKeywords(res.data.topicKeywords);
            }

            // // 请求一次数据之后，将选择的id设置为空
            // setSelectedTopicId("")
          } else {
            console.log("selectedTopicId: ", res.msg);
          }
        });
      } catch (err) {
        console.log("selectedTopicId: ", err);
      }
    }
  }, [selectedTopicId, selectedTopics]);

  // 支持两种布局模式之间的切换
  const drawTopicTree = (
    data,
    mode,
    chartGapY,
    selectedTopics,
    topicWordsThreshold,
    showText,
    gapX,
    gapY
  ) => {
    if (!resizeRef) return;

    // 绘图之前先清除画布
    d3.select("#topic-tree svg").remove();

    if (selectedTopics.length !== 0) {
      // 根据主题进行过滤
      data = get_included_topics_nodes(deepCopy(data), selectedTopics);
    }

    if (!data || JSON.stringify(data) === "{}") return;

    // 获取节点链接树得最大深度
    // var width = Math.floor(resizeRef.current.offsetWidth) * 0.9; // 初始化视图宽高;
    // var height = Math.floor(resizeRef.current.offsetHeight) * 0.9;

    const margin = { top: 10, right: 100, bottom: 10, left: 50 };
    const max_depth = 10, max_height = 13;
    var width = gapX* max_depth;
    var height = gapY* max_height;

    const diagonal = d3
      .linkHorizontal()
      .x((d) => d.y)
      .y((d) => d.x);
    var tree;
    if (mode === "cluster") {
      // 集群图，所有叶子节点都在相同的深度上
      tree = d3
        .cluster()
        .size([
          height - (margin.top + margin.bottom),
          width - (margin.left + margin.right),
        ]);
    } else {
      tree = d3
        .tree()
        .size([
          height - 50,
          width - 200,
          // height - (margin.top + margin.bottom),
          // width - (margin.left + margin.right),
        ]); // 普通树图（空间布局上更加紧凑）
    }
    let maxRepoIds_length = 0;
    let maxRestRepoIds_length = -1;
    let nodeFilteredReposNumberColorScale;
    const dx = 10;
    const root = d3.hierarchy(data);
    // root.x0 = dx / 2;
    root.y0 = 400;
    // root.y0 = chartGapY;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      maxRepoIds_length = d3.max([maxRepoIds_length, d.data.repoIds.length]);
      if (d.data.restRepoIdsLength) {
        maxRestRepoIds_length = d3.max([
          maxRestRepoIds_length,
          d.data.restRepoIdsLength,
        ]);
      }
      included_topicIds.push(d.data.id); // 保留所有需要的节点
    });

    const svg = d3
      .select("#topic-tree")
      .append("svg")
      .attr('width', width + 50)
      .attr('heigt', height)
      // .attr("viewBox", [-margin.left, -margin.top, width, dx])
      .style("user-select", "none");


    const container = svg.append("g");

    const gLink = container
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#444")
      // .attr("stroke", "rgba(6 8, 68, 68, 0)")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 1);

    const gNode = container
      .append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");


    const nodeReposNumberColorScale = d3 // 全部文档的，内圆的颜色映射
      .scaleLinear()
      .domain([0, maxRepoIds_length]) // 设置输入域范围
      .range(["#fff", "#c06428"]);
    if (maxRestRepoIds_length !== -1) {
      nodeFilteredReposNumberColorScale = d3 // 全部文档的，内圆的颜色映射
        .scaleLinear()
        .domain([0, maxRestRepoIds_length]) // 设置输入域范围
        .range(["#fff", "#f3125b"]);
    }
    const tip = d3Tip()
      .attr("class", "d3-tip")
      .html(function (e, d) {
        if (d.data.type === "merged") return d.data.topic;
        // 叶子节点展示出全部主题/文档数量/过滤后的文档数量
        let htr = `${d.data.topic}<br />repo number: ${d.data.repoIds.length}<br />`;  
        if (d.data.restRepoIdsLength) {
          htr += `filtered number: ${d.data.restRepoIdsLength}`;
        }
        return htr;
      });
    const rectTip = d3Tip()
      .attr("class", "d3-tip")
      .html(function (e, d, value) {
        let htr = `${d}: ${value}`;
        return htr;
      });

    svg.call(tip);
    svg.call(rectTip);

    svg.call(d3.zoom()
    .extent([[-300, -300], [300, 300]])
    .scaleExtent([-8, 8])
    .on("zoom", zoomed));

  function zoomed({transform}) {
    container.attr("transform", transform);
  }


    // Updated
    function update(source) {
      const duration = 500;
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout.
      tree(root);

      let left = root;
      let right = root;
      root.eachBefore((node) => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
      });

      const height = right.x - left.x + margin.top + margin.bottom;

      const transition = svg
        .transition()
        .duration(duration)
        // .attr("viewBox", [-2 * margin.left, left.x - margin.top, width, height])
        .tween(
          "resize",
          window.ResizeObserver ? null : () => () => svg.dispatch("toggle")
        );

      // Update the nodes…
      const node = gNode.selectAll(".node-g").data(nodes, (d) => d.id);

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node-g")
        .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", function(event, d){   // 单击选择当前节点的数据
          selected_topic_type = d.data.type;
          setSelectedTopicId(d.data.id); // 双击设置当前选择的主题id，更新下方视图数据
          svg.selectAll('.node-g').classed("node-selected", false)  // 先取消所有元素的被选择状态
          d3.select(this).classed("node-selected", true)  // 当前选中的元素添加选择状态
        })
        .on("dblclick", function (event, d) {
          // 双击折叠
          d.children = d.children ? null : d._children;
          update(d);
        })
        // .on("click", (event, d) => {
        //   // 双击折叠
        //   d.children = d.children ? null : d._children;
        //   update(d);
        // })

      // 在每个节点中心绘制两个半圆，分别表示两个词的信息，对于拥挤的，有重叠的，绘制一个半圆
      for (let i = 0; i < nodeEnter._groups[0].length; i++) {
        // 合并节点和叶节点的样式不同
        let curNode = d3.select(nodeEnter._groups[0][i]);
        if (curNode.empty()) continue;

        let curDatum = curNode.datum();

        if (curDatum.data.type === "merged") {
          let rectHeight = 20,
            rectWidth = 30;
          const groupG = curNode
            .append("g")
            .attr(
              "transform",
              "translate(" + -rectWidth / 2 + "," + -rectHeight + ")"
            );
          let word_dis = curDatum.data.word_dis;
          // const keys = Object.keys(word_dis);
          const keys = Object.keys(word_dis).sort((a, b) => word_dis[a]['index'] - word_dis[b]['index']);

          // 创建颜色比例尺
          const colorScale = d3
            .scaleOrdinal()
            .domain(keys)
            .range(d3.schemeCategory10);

          const x = d3
            .scaleBand()
            .rangeRound([0, rectWidth])
            .padding(0.1)
            .domain(keys);

          const y = d3
            .scaleLinear()
            .rangeRound([rectHeight, 0])
            .domain([
              Math.min(
                0,
                d3.min(keys, (key) =>
                  Math.min(word_dis[key].upper, word_dis[key].lower)
                )
              ),
              d3.max(keys, (key) =>
                Math.max(word_dis[key].upper, word_dis[key].lower)
              ),
            ]);

          groupG
            .selectAll(".bar-upper")
            .data(keys)
            .enter()
            .append("rect")
            .attr("class", (d) => `group-bar group-bar-${d}`)
            .attr("x", (d) => x(d) + x.bandwidth() / 2 - 2.5)
            .attr("y", (d) => y(Math.max(0, word_dis[d].upper)))
            .attr("width", 2)
            .attr("height", (d) => Math.abs(y(word_dis[d].upper) - y(0)))
            .style("fill", (d) => '#7eb1d4') // 设置颜色 #7eb1d4 #face30  #da3174
            // .style("fill", (d) => colorScale(d)) // 设置颜色
            .on("mouseover", function (e, d) {
              // 高亮相同类的矩形并隐藏其他矩形
              svg.selectAll(".group-bar").style("opacity", 0.2); // 隐藏所有矩形
              svg.selectAll(".group-bar-" + d).style("opacity", 1); // 显示相同类的矩形
              rectTip.show(e, d, word_dis[d].upper, this)
              // rectTip.show(e, d, this)
            })
            .on("mouseout", function (e, d) {
              svg.selectAll(".group-bar").style("opacity", 1);
              rectTip.hide(e, d, word_dis[d].upper, this) 
              // rectTip.hide(e, d, this)
            });

          groupG
            .selectAll(".bar-lower")
            .data(keys)
            .enter()
            .append("rect")
            .attr("class", (d) => `group-bar group-bar-${d}`)
            .attr("x", (d) => x(d) + x.bandwidth() / 2 - 2.5)
            .attr("y", (d) => y(Math.min(0, word_dis[d].lower)))
            .attr("width", 2)
            .attr("height", (d) => Math.abs(y(0) - y(word_dis[d].lower)))
            .style("fill", (d) => '#da3174') // 设置颜色  #da3174
            // .style("fill", (d) => colorScale(d)) // 设置颜色
            .on("mouseover", function (e, d) {
              // 高亮相同类的矩形并隐藏其他矩形
              svg.selectAll(".group-bar").style("opacity", 0.2); // 隐藏所有矩形
              svg.selectAll(".group-bar-" + d).style("opacity", 1); // 显示相同类的矩形
              rectTip.show(e, d, word_dis[d].lower, this)
            })
            .on("mouseout", function (e, d) {
              svg.selectAll(".group-bar").style("opacity", 1);
              rectTip.hide(e, d, word_dis[d].lower, this) 
            });

            
          // 每个合并节点出显示主题词
          if (showText) {
            curNode
              .append("text")
              .attr('y', 3)
              .attr('x', 15)
              .attr('fill', 'black')
              // .text((d) => d.data.topic)
              .text((d) => d.data.topic.split('_').slice(0,3).join('_'))
              // .text((d) => d.data.topic.substring(0, 10) + "...")
              .attr("text-anchor", "start")
              .on("mouseover", tip.show)    //文本节点上展示出全部的文字
              .on("mouseout", tip.hide);
              // .attr("text-anchor", "middle");

          }
        } else {
          let outerRadius = 20, innerRadius = outerRadius - 3, circleR = 12;
          try {
            // 在每个叶节点处添加一个背景原，颜色深浅表示属于该主题的项目数量
            curNode
              .append("circle")
              .attr("r", circleR)
              .attr(
                "fill",
                nodeReposNumberColorScale(curDatum.data.repoIds.length)
              )
              .attr("stroke", "#eeba8b")
              .attr("stroke-width", 1)
              .on("mouseover", tip.show)    //文本节点上展示出全部的文字
              .on("mouseout", tip.hide);
            
              
            // 叶子节点展示文本  rgba(199, 117, 64, 0.1)
            curNode
            .append("text")
            .attr('y', 5)
            .attr('x', 25)
            .attr('fill', 'black')
            .text((d) => d.data.topic.split('_').slice(0,3).join('_'))
            // .text((d) => d.data.topic.substring(0, 10) + "...")
            .attr("text-anchor", "start");

            // 有这个属性，表示是过滤后的
            if (
              curDatum.data.restRepoIdsLength &&
              curDatum.data.restRepoIdsLength !== curDatum.data.repoIds.length
            ) {
              // 在每个叶节点处添加一个背景原，颜色深浅表示属于该主题的项目数量
              curNode
                .append("circle")
                .attr("r", circleR/2)
                .attr(
                  "fill",
                  nodeFilteredReposNumberColorScale(
                    curDatum.data.restRepoIdsLength
                  )
                )
                .attr("stroke", "#fff")
                .attr("storke-width", 1);
            }

            // 当前节点拥有的词，只在图中最多展示出前三个词的信息，按照概率降序排列
            const words = curDatum.data.words.filter(e => e.p > topicWordsThreshold).sort((a, b) => b.p - a.p);
            let arc = d3.arc().innerRadius(circleR+1).outerRadius(circleR + 4);
            let pie = d3.pie()
              .padAngle(0.1)
              .sort(null)
              .value(d => d.p)
            let arcs = pie(words);
            curNode.selectAll("path")
                  .data(arcs)
                  .join("path")
                  .attr("d",arc)
                  .attr("fill", (d, i) => pieColor[i]);

          } catch (e) {
            console.log("报错了，没有子节点数据"); // 操作过快可能会出现这个问题
          }
        }
      }

      // Transition nodes to their new position.
      const nodeUpdate = node
        .merge(nodeEnter)
        .transition(transition)
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("fill", "#aaa");

      // Transition exiting nodes to the parent's new position.
      const nodeExit = node
        .exit()
        .transition(transition)
        .remove()
        .attr("transform", (d) => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      // Update the links…
      const link = gLink.selectAll("path").data(links, (d) => d.target.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link
        .enter()
        .append("path")
        .attr("d", (d) => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      // Transition links to their new position.
      link.merge(linkEnter).transition(transition).attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link
        .exit()
        .transition(transition)
        .remove()
        .attr("d", (d) => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      // Stash the old positions for transition.
      root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    update(root);
  };

  function get_included_tech_topics_nodes(node, targeTopics) {
    if (!node || !node.children) {
      return null;
    }

    node.children = node.children
      .map((child) => get_included_tech_topics_nodes(child, targeTopics))
      .filter(Boolean);

    if (targeTopics.includes(node.id)) {
      return node;
    }

    if (node.children.length > 0) {
      return node;
    }

    return null;
  }

  function get_included_topics_nodes(node, targeTopics) {
    if (!node || !node.children) {
      return null;
    }

    node.children = node.children
      .map((child) => get_included_topics_nodes(child, targeTopics))
      .filter(Boolean);

    if (shouldBeDeleted(targeTopics, node)) {
      return node;
    }

    if (node.children.length > 0) {
      return node;
    }

    return null;
  }

  function shouldBeDeleted(arr1, node) {
    let nodeTopics = node && node["topic"];

    if (!nodeTopics) return false;
    let nodeTopicsArr = nodeTopics.split("_");
    for (let i of arr1) {
      if (nodeTopicsArr.includes(i)) {
        return true;
      }
    }
    return false;
  }

  const calcAng = (value) => value * (Math.PI / 180);
  const calcFinalAng = (value, startAngle, endAngle, linestroke, maxValue) => {
    return calcAng(
      startAngle + ((endAngle - startAngle - linestroke) * value) / maxValue
    );
  };

  const onTreeLayoutChange = (e: RadioChangeEvent) => {
    setTreeLayout(e.target.value);
  };

  const onChangeTopicModelMinTopicSize = debounce((value) => {
    value = value[0]
    
    setMinTopicSize(value);
    try {
      adjustMinTopicSizeModel(value).then((res: IRes) => {
        // 传入最小topic size
        if (res.ok) {
          console.log("onChangeTopicModelMinTopicSize", res.data);
          setListResultDt(res.data.listData);
          setTopicModelTreeDt(res.data.topicModelData);
          setTopicKeywords(res.data.topicsOverview);
          setSearchTopicsDt(res.data.searchTopicsDt);
          setSelectedTopicId("")  // 调整主题之后需要清楚被选择的主题id
        } else {
          console.log("onChangeTopicModelMinTopicSize: ", res.msg);
        }
      });
    } catch (err) {
      console.log("onChangeTopicModelMinTopicSize: ", err);
    }
  })

  const onTopicWordScopeChange = (e) => {
    setTopicWordScope(e.target.value);
  };

  const onShowTextChange = (e) => {
    setShowText(e.target.checked)
  }

  return (
    <>
      <div className="topic-tree-up">
        <div className="topic-tree-chart-container">
          <div
            id="topic-tree"
            className="topic-tree-chart"
            ref={resizeRef}
          ></div>
        </div>

        <div className="topic-tree-left">
          <div className="topic-tree-control">
            <div className="tree-layout-setting">
              {/* 更改视图布局 */}
              <span className="tree-control-subtitle">Tree layout</span>
              <Radio.Group
                size="small"
                onChange={onTreeLayoutChange}
                defaultValue={treeLayout}
              >
                <Radio.Button value="cluster">
                  <svg viewBox="0 0 1024 1024" width="16" height="16">
                    <path
                      fill="#8a8a8a"
                      d="M488.96 785.066667h478.976c30.549333 0 56.064 28.416 56.064 68.266666v102.4c0 34.133333-25.514667 68.266667-56.064 68.266667H35.669333C15.36 1024 0 1006.933333 0 984.149333L5.034667 68.266667c0-39.850667 25.429333-68.266667 56.064-68.266667h124.757333c30.549333 0 56.064 28.416 56.064 68.266667V170.666667c0 34.133333-25.514667 68.266667-56.064 68.266666H142.506667v239.018667h285.354666v-11.434667c0-34.133333 25.514667-68.266667 56.064-68.266666h478.890667c30.634667 0 56.064 28.416 56.064 68.266666v102.4c0 34.133333-25.429333 68.266667-56.064 68.266667H483.925333c-30.634667 0-56.064-28.416-56.064-68.266667v-11.434666H142.506667v312.832h285.354666V853.333333c-0.085333-34.133333 25.344-68.266667 61.098667-68.266666z m478.976-546.133334H359.765333c-35.754667 0-61.184-34.133333-61.184-68.266666V68.266667c0-39.850667 25.429333-68.266667 61.184-68.266667h608.170667c30.549333 0 56.064 28.416 56.064 68.266667V170.666667c0 34.133333-25.514667 68.266667-56.064 68.266666z"
                    ></path>
                  </svg>
                  &nbsp;Cluster
                </Radio.Button>
                <Radio.Button value="tree">
                  <svg viewBox="0 0 1024 1024" width="16" height="16">
                    <path
                      fill="#8a8a8a"
                      d="M167.872 595.2v217.6h142.976V768H960v192H310.848v-44.8H64V172.8h246.848V128h259.648v192H310.848v-44.8H167.872v217.6h142.976V448h454.4v192h-454.4v-44.8H167.872z"
                    ></path>
                  </svg>
                  &nbsp;Tree&nbsp;&nbsp;&nbsp;
                </Radio.Button>
              </Radio.Group>
              <Checkbox
                checked={showText}
                onChange={onShowTextChange}
              >
                Show text
              </Checkbox>
            </div>
            <div className="tree-layout-setting">
              {/* 设置单个节点的宽度 */}
              <span className="tree-control-subtitle">Node width</span>
              <div className="icon-wrapper">
                <MinusOutlined />
                <Slider onChange={setChartGapX} value={chartGapX} min={10} max={400} step={10}/>
                <PlusOutlined />
              </div>
              {/* 设置单个节点的高度 */}
              <span className="tree-control-subtitle">Node height</span>
              <div className="icon-wrapper">
                <MinusOutlined />
                <Slider onChange={setChartGapY} value={chartGapY}  min={10} max={400} step={10}/>
                <PlusOutlined />
              </div>
            </div>
            <div className="tree-layout-setting">
              {/* 设置主题阈值，这里不需要后端，直接从数据的p属性中获取 */}
              <span className="tree-control-subtitle">Topic min size</span>
              <div className="icon-wrapper">
                <MinusOutlined />
                <Slider
                  min={5}
                  max={20}
                  step={2}
                  onChange={onChangeTopicModelMinTopicSize}
                  value={minTopicSize}
                />
                <PlusOutlined />
              </div>
            </div>
            <div className="tree-layout-setting">
              <span className="tree-control-subtitle">Keyword threshold</span>
              <div className="icon-wrapper">
                <MinusOutlined />
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={setTopicWordsThreshold}
                  value={topicWordsThreshold}
                />
                <PlusOutlined />
              </div>
            </div>
            {/* 搜索结果中的主题词，在图中对应的节点进行高亮突出显示，这里只是搜索，不需要请求后端  */}
            <div className="tree-layout-setting">
              <span className="tree-control-subtitle">Topic search</span>
              <Select
                allowClear
                size="small"
                mode="multiple"
                placeholder="Select topics"
                value={selectedTopics}
                onChange={setSelectedTopics} // 图中有数据，直接过滤
                style={{ width: "100%", color: "#105ea3" }}
                options={searchTopicsDt.map((item) => ({
                  value: item,
                  label: item,
                }))}
                // options={filteredOptions.map((item) => ({
                //   value: item,
                //   label: item,
                // }))}
              />
            </div>
            <div className="topic-word-scope-select">
              <ConfigProvider
                theme={{
                  components: {
                    Radio: {
                      dotSize: 6,
                      radioSize: 10,
                      wrapperMarginInlineEnd: 0,
                      optionFontSize: 6,
                    },
                  },
                }}
              >
                <Radio.Group
                  onChange={onTopicWordScopeChange}
                  value={topicWordScope}
                >
                  <Radio value="all" className="word-selection">
                    All
                  </Radio>
                  <Radio value="current" className="word-selection">
                    Leaft
                  </Radio>
                </Radio.Group>
              </ConfigProvider>
            </div>
            {topicWordScope === "all" ? (
              <TopicSelection
                data={topicsOverview}
                setSelectedTopics={setSelectedTopics}
                selectedTopics={selectedTopics}
              />
            ) : (
              <LeaftKeyword data={topicKeywords} />
            )}
          </div>
        </div>
      </div>
      {/* 下方的子图 */}
      <div className="topic-tree-right">
        <div className="details">
          <RepoCluster
            forkMin={0}
            forkMax={forkMax}
            watchMin={0}
            watchMax={watchMax}
            topicClusterDt={topicClusterDt}
            subclusterDt={subclusterDt}
            selectedTopicId={selectedTopicId}
            setSelectedRepoId={setSelectedRepoId}
            setUiLeftDirection={setUiLeftDirection}
          />
        </div>
      </div>
    </>
  );
};

export default React.memo(TopicModelTree);

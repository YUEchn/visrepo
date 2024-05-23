// 对于整体的主题概览：展示哪些主题词在文档中更加普遍：
// 应该展示包含合并主题和叶子节点主题的所有主题词，因为合并节点主题词中可能会包含叶子节点中没有的主题词

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getCooccurenceTopic } from "../../apis/api.ts";
import d3Tip from "d3-tip";
import { IRes } from "../../utils/type";

const color = [
  "#FE7A36",
  "#265073",
  "#8CB9BD",
  "#D7E4C0",
  "#F28585",
  "#81689D",
  "#FDF0D1",
  "#50623A",
  "#FAE7F3",
  "#B19470",
  "#FFAD84",
  "#12372A",
  "#40A2E3",
  "#607274",
  "#B2A59B",
  "#FA7070",
  "#BED754",
];
const TopicSelection = ({ data, setSelectedTopics, selectedTopics }) => {
  const [selectedTextIndex, setSelectedTextIndex] = useState(-1);  // 默认为-1，即没有元素会需要添加相关的词汇
  const [cooccurenceTopic, setCooccurenceTopic] = useState([]);  // 相关的词汇，默认为空
  const resizeRef = useRef(null);


  useEffect(() => {
    drawTopicSelection(data, selectedTopics, selectedTextIndex, cooccurenceTopic);
  }, [data, selectedTopics, cooccurenceTopic, selectedTextIndex]);

  const drawTopicSelection = (data, selectedTopics, selectedTextIndex, cooccurenceTopic) => {
    d3.select("#topic-selection-chart svg").remove();
    d3.selectAll(".d3-tip").remove();
    if (data.length === 0) return;

    data = [
    {
        "topicName": "id",
        "value": 538
    },
    {
        "topicName": "project",
        "value": 520
    },
    {
        "topicName": "web",
        "value": 516
    },
    {
        "topicName": "end",
        "value": 507
    },
    {
        "topicName": "application",
        "value": 446
    },
    {
        "topicName": "tool",
        "value": 328
    },
    {
        "topicName": "react",
        "value": 317
    },
    {
        "topicName": "algorithm",
        "value": 316
    },
    {
        "topicName": "d3",
        "value": 307
    },
    {
        "topicName": "user",
        "value": 300
    },
    {
        "topicName": "time",
        "value": 266
    },
    {
        "topicName": "library",
        "value": 259
    },
    {
        "topicName": "network",
        "value": 226
    },
    {
        "topicName": "format",
        "value": 215
    },
    {
        "topicName": "chart",
        "value": 188
    },
    {
        "topicName": "file",
        "value": 183
    },
    {
        "topicName": "path",
        "value": 179
    },
    {
        "topicName": "search",
        "value": 173
    },
    {
        "topicName": "git",
        "value": 164
    },
    {
        "topicName": "hub",
        "value": 154
    },
    {
        "topicName": "server",
        "value": 143
    },
    {
        "topicName": "github",
        "value": 137
    },
    {
        "topicName": "force",
        "value": 135
    },
    {
        "topicName": "tree",
        "value": 122
    },
    {
        "topicName": "demo",
        "value": 122
    },
    {
        "topicName": "scatter",
        "value": 118
    },
    {
        "topicName": "depend",
        "value": 111
    },
    {
        "topicName": "directed",
        "value": 107
    },
    {
        "topicName": "scatterplot",
        "value": 101
    },
    {
        "topicName": "algorithms",
        "value": 100
    },
    {
        "topicName": "layout",
        "value": 98
    },
    {
        "topicName": "component",
        "value": 97
    },
    {
        "topicName": "short",
        "value": 95
    },
    {
        "topicName": "track",
        "value": 91
    },
    {
        "topicName": "query",
        "value": 88
    },
    {
        "topicName": "light",
        "value": 86
    },
    {
        "topicName": "camp",
        "value": 77
    },
    {
        "topicName": "dependency",
        "value": 74
    },
    {
        "topicName": "dijkstra",
        "value": 74
    },
    {
        "topicName": "local",
        "value": 74
    },
    {
        "topicName": "fig",
        "value": 73
    },
    {
        "topicName": "repository",
        "value": 69
    },
    {
        "topicName": "ros",
        "value": 68
    },
    {
        "topicName": "sort",
        "value": 66
    },
    {
        "topicName": "model",
        "value": 66
    },
    {
        "topicName": "module",
        "value": 65
    },
    {
        "topicName": "connection",
        "value": 65
    },
    {
        "topicName": "element",
        "value": 59
    },
    {
        "topicName": "dashboard",
        "value": 58
    },
    {
        "topicName": "freecodecamp",
        "value": 57
    },
    {
        "topicName": "visualizing",
        "value": 55
    },
    {
        "topicName": "neo",
        "value": 54
    },
    {
        "topicName": "group",
        "value": 53
    },
    {
        "topicName": "friend",
        "value": 51
    },
    {
        "topicName": "knowledge",
        "value": 50
    },
    {
        "topicName": "people",
        "value": 49
    },
    {
        "topicName": "course",
        "value": 48
    },
    {
        "topicName": "pathfinding",
        "value": 48
    },
    {
        "topicName": "fcc",
        "value": 48
    },
    {
        "topicName": "theory",
        "value": 47
    },
    {
        "topicName": "traversal",
        "value": 46
    },
    {
        "topicName": "kg",
        "value": 44
    },
    {
        "topicName": "interaction",
        "value": 42
    },
    {
        "topicName": "story",
        "value": 42
    },
    {
        "topicName": "social",
        "value": 42
    },
    {
        "topicName": "19",
        "value": 41
    },
    {
        "topicName": "sorting",
        "value": 38
    },
    {
        "topicName": "breadth",
        "value": 37
    },
    {
        "topicName": "array",
        "value": 36
    },
    {
        "topicName": "air",
        "value": 35
    },
    {
        "topicName": "word",
        "value": 35
    },
    {
        "topicName": "maze",
        "value": 34
    },
    {
        "topicName": "cytoscape",
        "value": 34
    },
    {
        "topicName": "covid",
        "value": 33
    },
    {
        "topicName": "projects",
        "value": 33
    },
    {
        "topicName": "webgl",
        "value": 33
    },
    {
        "topicName": "install",
        "value": 32
    },
    {
        "topicName": "team",
        "value": 31
    },
    {
        "topicName": "dot",
        "value": 31
    },
    {
        "topicName": "neo4j",
        "value": 30
    },
    {
        "topicName": "npm",
        "value": 29
    },
    {
        "topicName": "metric",
        "value": 29
    },
    {
        "topicName": "minimum",
        "value": 28
    },
    {
        "topicName": "generation",
        "value": 27
    },
    {
        "topicName": "music",
        "value": 27
    },
    {
        "topicName": "game",
        "value": 27
    },
    {
        "topicName": "technology",
        "value": 27
    },
    {
        "topicName": "wiki",
        "value": 26
    },
    {
        "topicName": "paper",
        "value": 25
    },
    {
        "topicName": "url",
        "value": 24
    },
    {
        "topicName": "audio",
        "value": 24
    },
    {
        "topicName": "tracker",
        "value": 23
    },
    {
        "topicName": "degree",
        "value": 23
    },
    {
        "topicName": "corresponding",
        "value": 23
    },
    {
        "topicName": "temperature",
        "value": 23
    },
    {
        "topicName": "stock",
        "value": 22
    },
    {
        "topicName": "root",
        "value": 22
    },
    {
        "topicName": "commit",
        "value": 22
    },
    {
        "topicName": "transaction",
        "value": 21
    },
    {
        "topicName": "iot",
        "value": 20
    },
    {
        "topicName": "facebook",
        "value": 20
    },
    {
        "topicName": "match",
        "value": 20
    },
    {
        "topicName": "math",
        "value": 19
    },
    {
        "topicName": "twitter",
        "value": 19
    },
    {
        "topicName": "axis",
        "value": 18
    },
    {
        "topicName": "author",
        "value": 18
    },
    {
        "topicName": "child",
        "value": 17
    },
    {
        "topicName": "certification",
        "value": 17
    },
    {
        "topicName": "cost",
        "value": 17
    },
    {
        "topicName": "article",
        "value": 16
    },
    {
        "topicName": "rdf",
        "value": 16
    },
    {
        "topicName": "price",
        "value": 16
    },
    {
        "topicName": "frequency",
        "value": 16
    },
    {
        "topicName": "player",
        "value": 15
    },
    {
        "topicName": "binary",
        "value": 15
    },
    {
        "topicName": "spotify",
        "value": 15
    },
    {
        "topicName": "sensor",
        "value": 15
    },
    {
        "topicName": "cache",
        "value": 14
    },
    {
        "topicName": "semantic",
        "value": 14
    },
    {
        "topicName": "expense",
        "value": 14
    },
    {
        "topicName": "leaf",
        "value": 13
    },
    {
        "topicName": "budget",
        "value": 13
    },
    {
        "topicName": "graphql",
        "value": 13
    },
    {
        "topicName": "weather",
        "value": 13
    },
    {
        "topicName": "topic",
        "value": 13
    },
    {
        "topicName": "sequence",
        "value": 13
    },
    {
        "topicName": "traffic",
        "value": 13
    },
    {
        "topicName": "tweet",
        "value": 12
    },
    {
        "topicName": "osp",
        "value": 12
    },
    {
        "topicName": "adjacency",
        "value": 11
    },
    {
        "topicName": "artist",
        "value": 11
    },
    {
        "topicName": "sandbox",
        "value": 11
    },
    {
        "topicName": "bw",
        "value": 10
    },
    {
        "topicName": "citation",
        "value": 10
    },
    {
        "topicName": "peer",
        "value": 10
    },
    {
        "topicName": "water",
        "value": 9
    },
    {
        "topicName": "gremlin",
        "value": 9
    },
    {
        "topicName": "bitcoin",
        "value": 9
    },
    {
        "topicName": "basis",
        "value": 9
    },
    {
        "topicName": "serial",
        "value": 8
    },
    {
        "topicName": "india",
        "value": 8
    },
    {
        "topicName": "grafana",
        "value": 8
    },
    {
        "topicName": "hex",
        "value": 8
    },
    {
        "topicName": "choropleth",
        "value": 8
    },
    {
        "topicName": "follower",
        "value": 7
    },
    {
        "topicName": "annotation",
        "value": 7
    },
    {
        "topicName": "discrete",
        "value": 7
    },
    {
        "topicName": "pixel",
        "value": 7
    },
    {
        "topicName": "sap",
        "value": 7
    },
    {
        "topicName": "phase",
        "value": 7
    },
    {
        "topicName": "pokemon",
        "value": 6
    },
    {
        "topicName": "prerequisite",
        "value": 6
    },
    {
        "topicName": "disease",
        "value": 5
    },
    {
        "topicName": "protein",
        "value": 5
    },
    {
        "topicName": "hardware",
        "value": 4
    },
    {
        "topicName": "zone",
        "value": 4
    },
    {
        "topicName": "fantasy",
        "value": 3
    },
    {
        "topicName": "influent",
        "value": 3
    },
    {
        "topicName": "lightningchart",
        "value": 3
    },
    {
        "topicName": "russia",
        "value": 3
    },
    {
        "topicName": "pathway",
        "value": 3
    },
    {
        "topicName": "competitor",
        "value": 3
    },
    {
        "topicName": "resume",
        "value": 3
    },
    {
        "topicName": "vizceral",
        "value": 3
    },
    {
        "topicName": "neovis",
        "value": 3
    },
    {
        "topicName": "copyright",
        "value": 3
    },
    {
        "topicName": "theta",
        "value": 3
    },
    {
        "topicName": "disaster",
        "value": 2
    },
    {
        "topicName": "eventloop",
        "value": 2
    },
    {
        "topicName": "april",
        "value": 2
    },
    {
        "topicName": "wordnet",
        "value": 2
    },
    {
        "topicName": "atop",
        "value": 2
    },
    {
        "topicName": "bookmarklet",
        "value": 2
    },
    {
        "topicName": "legal",
        "value": 2
    },
    {
        "topicName": "mandatory",
        "value": 2
    },
    {
        "topicName": "odata",
        "value": 2
    },
    {
        "topicName": "clock",
        "value": 1
    },
    {
        "topicName": "depvis",
        "value": 1
    },
    {
        "topicName": "survival",
        "value": 1
    },
    {
        "topicName": "morphs",
        "value": 1
    },
    {
        "topicName": "ufo",
        "value": 1
    },
    {
        "topicName": "nuclear",
        "value": 1
    },
    {
        "topicName": "cachier",
        "value": 1
    },
    {
        "topicName": "cmu",
        "value": 1
    },
    {
        "topicName": "degeneracy",
        "value": 1
    },
    {
        "topicName": "weapon",
        "value": 1
    },
    {
        "topicName": "stratospherewebclient",
        "value": 1
    },
    {
        "topicName": "neohic",
        "value": 1
    },
    {
        "topicName": "pgl",
        "value": 1
    },
    {
        "topicName": "origami",
        "value": 1
    },
    {
        "topicName": "cortex",
        "value": 1
    },
    {
        "topicName": "unified",
        "value": 1
    },
    {
        "topicName": "gradcam",
        "value": 1
    },
    {
        "topicName": "circulant",
        "value": 1
    },
    {
        "topicName": "webgis",
        "value": 1
    },
    {
        "topicName": "scivi",
        "value": 1
    },
    {
        "topicName": "ganeti",
        "value": 1
    },
    {
        "topicName": "environmental",
        "value": 1
    },
    {
        "topicName": "connectedto",
        "value": 1
    },
    {
        "topicName": "broken",
        "value": 1
    },
    {
        "topicName": "reachability",
        "value": 1
    },
    {
        "topicName": "dimo",
        "value": 1
    },
    {
        "topicName": "ahrs",
        "value": 1
    },
    {
        "topicName": "mathml",
        "value": 1
    }
]

    data.sort((a, b) => b.value - a.value);

    const margin = { top: 10, right: 1, bottom: 10, left: 1 };
    var width = Math.floor(resizeRef.current.offsetWidth) * 0.9; // 初始化视图宽高;
    const height = data.length * 30 + margin.top + margin.bottom;

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)])
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.topicName))
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.1);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const tip = d3Tip()
      .attr("class", "d3-tip")
      .html(function (e, d) {
        let htr = ` ${d.topicName}: ${d.value}`;
        return htr;
      });

    const svg = d3
      .select("#topic-selection-chart")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("user-select", "none");

    // 添加举行条
    const nodeWrapper = svg
      .append("g")

    const nodeCollection = nodeWrapper.selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr('transform', d=> `translate(${0}, ${y(d.topicName) + 10})`)
    nodeCollection
      .append("rect")
      .attr("width", (d) => x(d.value) - x(0))
      .attr("height", y.bandwidth() / 2)
      .attr("fill", "#ddd")
      // .attr("fill", (d) => color(d.topicName))
      .attr("stroke", (d) =>
        selectedTopics.includes(d.topicName) ? "#105ea3" : "transparent"
      )
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide)
      .on("click", function (e, d) {
        let isChcked = d3.select(this).attr("stroke");
        let curTopic = d.topicName;
        if (isChcked === "#105ea3") {
          // 当前是选中，则需要取消勾选这个
          let lastTopics = selectedTopics.filter((t) => t !== curTopic);
          setSelectedTopics(lastTopics);
          d3.select(this).attr("value", "false");
          d3.select(this).attr("stroke", "transparent");
        } else {
          selectedTopics.push(curTopic);
          setSelectedTopics([...selectedTopics]); // 这个是格式
          d3.select(this).attr("value", "true");
          d3.select(this).attr("stroke", "#105ea3");
        }
      });

    nodeWrapper
      .selectAll("text")
      .data([data[0]]) // 只添加第一个数据的具体数值
      .enter()
      .append("text")
      .attr("x", (d) => x(d.value))
      .attr("y", (d) => y(d.topicName) + y.bandwidth() / 2 - 10)
      .attr("dx", "-0.5em")
      .attr("dy", "0.1em")
      .style("font", "10px sans-serif")
      .attr("text-anchor", "end")
      .attr("fill", "#aaa")
      .text((d) => d.value);

    nodeCollection.append('text')
      .attr("class", "topic-selecticon-axis")
      .attr("x", "12")
      .attr("y", "-3")
      .text(d => d.topicName)

    // 在对应的位置添加词汇
    if(selectedTextIndex !== -1){
      let selectedElement = nodeCollection.filter(function(d, index) {
          return index === selectedTextIndex;
      });
      
      selectedElement.append('text')
        .attr("class", "topic-cooccurence")
        .attr("x", "12")
        .attr("y", "10")
        .text(cooccurenceTopic.join(' '))
    }

      // 定义加号的路径数据
   const plusPathData = "M 5 2 L 5 8 M 2 5 L 8 5";
   // 添加路径元素并指定路径数据
   nodeCollection.append("path")
    .attr("transform", "translate(1, -12)")
    .attr("d", plusPathData)
    .attr("stroke", "#bbb")
    .attr("stroke-width", 2)
    .attr('cursor', 'pointer')
    .attr("index", (d, i) => i)
    .on('click', function(e, d){
      let curTopicName = d.topicName;
      let index = parseInt(d3.select(this).attr("index"));
      // 请求后端，获取当前与当前主题词紧密相连的前两个词
      getCooccurenceTopic(curTopicName).then((res: IRes) => {
        if(res.ok){
          setCooccurenceTopic(res.data.npmiTopic);  
          setSelectedTextIndex(index);
        } else {
          console.log('查询共现词失败：', res.msg);
          
        }
      })
    })


    svg.call(tip);

  };

  return (
    <div
      id="topic-selection-chart"
      ref={resizeRef}
      style={{
        width: "100%",
        height: "1000px",
      }}
    ></div>
  );
};

export default React.memo(TopicSelection);

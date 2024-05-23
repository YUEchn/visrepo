// 对于整体的主题概览：展示哪些主题词在文档中更加普遍：
// 应该展示包含合并主题和叶子节点主题的所有主题词，因为合并节点主题词中可能会包含叶子节点中没有的主题词

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import d3Tip from "d3-tip";

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

const LeaftKeyword = ({data}) => {
  const resizeRef = useRef(null);

  useEffect(() => {
    drawTopicSelection(data);
  }, [data]);

  const drawTopicSelection = (data) => {
    d3.select("#leaft-keyword-chart svg").remove();
    d3.selectAll(".d3-tip").remove();
    if (data.length === 0) return;

    data.sort((a, b) => b.value-a.value)

    
    const valueHeight = 30;
    const margin = { top: 30, right: 1, bottom: 10, left: 1 };
    var width = Math.floor(resizeRef.current.offsetWidth) * 0.9; // 初始化视图宽高;

    const svg = d3
    .select("#leaft-keyword-chart")
    .append("svg")
    .attr('width', '100%')
    .attr('height', '100%')
    .style("user-select", "none");

    const pHeight = 2;
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const tip = d3Tip()
      .attr("class", "d3-tip")
      .html(function (e, d) {
        let htr = ` ${d.topicName}: ${d.value}/${d.p}`;
        return htr;
      });

      svg.call(tip)

    const yScale = d3
      .scaleBand()
      .range([0, data.length * valueHeight + 10])
      .domain(data.map((d) => d.topicName))
      .padding(0.1);

    const xValue = d3
      .scaleLinear()
      .range([0, width])
      .domain([0, d3.max(data, (d) => d.value)]);

    const xP = d3.scaleLinear().range([0, width]).domain([0, 1]);

    const bars = svg
      .selectAll(".keywords-bar")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "keywords-bar")
      .attr(
        "transform",
        (d) => `translate(${margin.left}, ${yScale(d.topicName) + margin.top})`
      )
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)

    bars
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", (d) => xValue(d.value))
      .attr("height", yScale.bandwidth() - 20)
      .attr("fill", "#699ac6")

    bars
      .append("rect")
      .attr("x", 0)
      .attr("y", yScale.bandwidth() - 18)
      .attr("width", (d) => xP(d.p))
      .attr("height", pHeight);

    bars
      .append("text")
      .attr("x", 0)
      .attr("y", -3)
      .text((d) => d.topicName)
      .attr("fill", "#aaa");

    svg
      .append("text")
      .attr("x",xValue(data[0].value))
      .attr("y", yScale(data[0].topicName) + margin.top - 2)
      .text(`${data[0].value}/${data[0].p}`)
      .attr("fill", "#aaa")
      .attr('text-anchor', 'end')
  };

  return (
    <div
      id="leaft-keyword-chart"
      ref={resizeRef}
      style={{
        width: "100%",
        height: "1000px",
      }}
    ></div>
  );
};

export default React.memo(LeaftKeyword);

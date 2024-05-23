import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Button, Checkbox } from "antd";
const subclusterDt = {
  languageDt: [
    ["United States", 123],
    ["Russia", 614],
    ["Germany (FRG)", 163],
    ["France", 2162],
    ["United Kingdom", 1214],
    ["China", 1131],
    ["Spain", 814],
    ["Netherlands", 1167],
    ["Italy", 660],
    ["Israel", 1263],
  ],
  techDt: [
    ["Spain1", 814],
    ["Netherlands1", 1167],
    ["United States", 123],
    ["Russia", 614],
    ["Germany (FRG)", 163],
    ["France", 2162],
    ["United Kingdom", 1214],
    ["China", 1131],
    ["Spain", 814],
    ["Netherlands", 1167],
    ["Italy", 660],
    ["Israel", 1263],
  ],
};

interface ISubclusterDetailsProps {
  subclusterDt: {
    languageDt: [];
    techDt: [];
  };
  setClusterDFilter: (p) => void;
}
const SubclusterDetails = (props: ISubclusterDetailsProps) => {
  let { subclusterDt, setClusterDFilter } = { ...props };
  let { languageDt, techDt } = { ...subclusterDt };
  const barRef = useRef({
    language: [],
    topic: [],
    shouldBeIncluded: true,
    isClear: false,
  });
  const subclassRef = useRef(null);
  const [shouldBeIncluded, setShouldBeIncluded] = useState(true); // 默认是应该添加进来的技术
  const [shouldBeClear, setShouldBeClear] = useState(false); // 默认是应该添加进来的技术

  useEffect(() => {
    if (
      (languageDt && languageDt.length !== 0) ||
      (techDt && techDt.length !== 0)
    ) {
      let t = [],
        l = [],
        beforeClick = 1, // 默认应该加进来，所以一开始的数组内容应该是空的
        afterClick = 0.3;
      if (!shouldBeIncluded) {
        beforeClick = 0.3;
        afterClick = 1;
      }
      barRef.current = {
        language: l,
        tech: t,
        shouldBeIncluded: shouldBeIncluded,
        isClear: shouldBeClear,
      };

      drawRanks(languageDt, techDt, beforeClick, afterClick);

      if (shouldBeClear) {
        setClusterDFilter({ ...barRef.current });
      }
    }
  }, [languageDt, techDt, shouldBeIncluded, shouldBeClear]);

  const drawRanks = (language, tech, beforeClick, afterClick) => {
    // 绘图之前先清除画布
    d3.select("#subclass-details svg").remove();

    tech.sort((a, b) => b[1] - a[1]);
    language.sort((a, b) => b[1] - a[1]);

    const margin = { top: 5, bottom: 5, left: 15, right: 5 };
    const chartGap = 5;
    const barHeight = 30;
    const w = Math.floor(subclassRef.current.offsetWidth) * 0.9 - chartGap; // 初始化
    // const h = Math.floor(subclassRef.current.offsetHeight) * 0.88;
    // 添加tooltip
    const subclusterTooltip = d3.select(".subcluster-tooltip");
    const languageH = (language.length + 1) * barHeight;
    const techH = (tech.length + 1) * barHeight;
    const h = Math.max(languageH, techH);
    const svg = d3
      .select("#subclass-details")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%");
    // .attr("viewBox", [0, 0, w * 1.1, h * 1.1]);
    const languagWrapper = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + w / 2 + chartGap}, ${margin.top})`
      )
      .attr("cursor", "pointer");
    const languageX = d3
      .scaleLinear()
      .domain([0, d3.max(language.map((d) => d[1]))])
      .range([0, w / 2]);
    const languageY = d3
      .scaleBand()
      .range([0, h])
      .domain(
        languageDt.map(function (d) {
          return d[0];
        })
      )
      .padding(0.1);
    languagWrapper
      .selectAll("myRect")
      .data(languageDt)
      .enter()
      .append("rect")
      .attr("x", languageX(0))
      .attr("y", function (d) {
        return languageY(d[0]);
      })
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", function (d) {
        return languageX(d[1]);
      })
      .attr("height", languageY.bandwidth())
      .attr("fill", "#98abc5")
      .attr("opacity", afterClick)
      .on("mouseover", function (e, d) {
        // 显示提示框
        subclusterTooltip
          .style("opacity", 1)
          .html(`repository number:  ${d[1]}`)
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 30 + "px");
      })
      .on("mouseout", function (e, d) {
        subclusterTooltip.style("opacity", 0);
      })
      .on("click", function (e, d) {
        let t = barRef.current.language;
        if (!t.includes(d[0])) {
          // 不清除该元素
          t.push(d[0]);
          d3.select(this).attr("opacity", beforeClick);
        } else {
          t = t.filter((item) => item !== d[0]);
          d3.select(this).attr("opacity", afterClick);
        }
        barRef.current.language = t;
      });
    const languageXTick = languagWrapper
      .append("g")
      .attr("transform", "translate(0," + h + ")")
      .call(d3.axisBottom(languageX));
    languageXTick
      .selectAll("text")
      .attr("fill", "#aaa")
      .attr("opacity", (d, i) => {
        return i % 2 === 0 && i !== 0 ? 1 : 0;
      })
      .attr("transform", "translate(0,0)rotate(-45)")
      .style("text-anchor", "end");
    languageXTick
      .selectAll("line")
      .attr("y2", (d, i) => (i % 2 === 0 && i !== 0 ? 4 : 0));
    languagWrapper
      .append("g")
      .call(d3.axisRight(languageY))
      .selectAll("line")
      .attr("x2", 0);

    // tech的bar
    const topicWrapper = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .attr("cursor", "pointer");
    const topicX = d3
      .scaleLinear()
      .domain([0, d3.max(tech.map((d) => d[1]))])
      .range([w / 2, 0]);
    const topicY = d3
      .scaleBand()
      .range([0, h])
      .domain(
        techDt.map(function (d) {
          return d[0];
        })
      )
      .padding(0.1);
    topicWrapper
      .selectAll("myRect")
      .data(techDt)
      .enter()
      .append("rect")
      .attr("x", (d) => topicX(d[1]))
      .attr("y", function (d) {
        return topicY(d[0]);
      })
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", function (d) {
        return w / 2 - topicX(d[1]);
      })
      .attr("height", topicY.bandwidth())
      .attr("fill", "#ffcc80")
      .attr("opacity", afterClick)
      .on("mouseover", function (e, d) {
        // 显示提示框
        subclusterTooltip
          .style("opacity", 1)
          .html(`repository number:  ${d[1]}`)
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 30 + "px");
      })
      .on("mouseout", function (e, d) {
        subclusterTooltip.style("opacity", 0);
      })
      .on("click", function (e, d) {
        let t = barRef.current.tech;
        if (!t.includes(d[0])) {
          // 不清楚该元素
          t.push(d[0]);
          d3.select(this).attr("opacity", beforeClick);
        } else {
          t = t.filter((item) => item !== d[0]);
          d3.select(this).attr("opacity", afterClick);
        }
        barRef.current.tech = t;
      });

    const topicXTick = topicWrapper
      .append("g")
      .attr("transform", "translate(0," + h + ")")
      .call(d3.axisBottom(topicX));
    topicXTick
      .selectAll("text")
      .attr("fill", "#aaa")
      .attr("opacity", (d, i) => {
        return i % 2 === 0 && i !== 0 ? 1 : 0;
      })
      .attr("transform", "translate(0,0)rotate(-45)")
      .style("text-anchor", "end");
    topicXTick
      .selectAll("line")
      .attr("y2", (d, i) => (i % 2 === 0 && i !== 0 ? 4 : 0));
    topicWrapper
      .append("g")
      .attr("transform", `translate(${w / 2}, 0)`)
      .call(d3.axisLeft(topicY))
      .selectAll("line")
      .attr("x2", 0);
  };

  const changeFilter = () => {
    setClusterDFilter({ ...barRef.current });
  };

  const onChangeShouldBeIncluded = (e) => {
    setShouldBeIncluded(e.target.checked);
  };
  // 清除过滤条件
  const onClearFilter = (e) => {
    setShouldBeClear(!shouldBeClear);
  };

  return (
    <div style={{ width: "20%", height: "100%" }}>
      <div style={{ width: "100%", height: "10%" }}>
        &nbsp;
        <Button size="small" type="dashed" onClick={changeFilter}>
          Filter
        </Button>
        <Button size="small" type="dashed" onClick={onClearFilter}>
          Clear   {/* 这个按钮要连续按两次，不然逻辑会出错 */}
        </Button>
        &nbsp;
        <Checkbox
          checked={shouldBeIncluded}
          onChange={onChangeShouldBeIncluded}
        >
          Included
        </Checkbox>
      </div>
      <div style={{ width: "100%", height: "90%", overflowY: "scroll" }}>
        <div
          id="subclass-details"
          style={{ width: "100%", height: 3000 }}
          ref={subclassRef}
        ></div>
      </div>
      <div className="subcluster-tooltip"></div>
    </div>
  );
};

export default React.memo(SubclusterDetails);

import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { Radio, ConfigProvider } from "antd";
import { topicWordBulletDt } from "../../utils/testData.ts";

// 暂时不处理，没有想好这个应该展示什么信息
const TopicWordBar = () => {
  const resizeRef = useRef(null);
  const [data, setDate] = useState(topicWordBulletDt);

  useEffect(() => {
    if (topicWordBulletDt.length !== 0) {
      drawTopicWordBar(data);
    }
  }, [data]);

  const drawTopicWordBar = (data) => {
    if (!resizeRef) return;

    d3.select("#topic-word-bar-chart svg").remove();

    const nodeHeight = 30;
    var width = Math.floor(resizeRef.current.offsetWidth) * 0.9; // 初始化视图宽高;
    var height = (data.length + 3) * nodeHeight;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    const svg = d3
      .select("#topic-word-bar-chart")
      .append("svg")
      .attr("viewBox", [-margin.left, -margin.top, width, height])
      .style("user-select", "none");

    var chart = bullet()
      .width(width - margin.left - margin.right)
      .height(nodeHeight - 15);
    const nodeWrapper = svg.append("g").attr("transform", `translate(0, 0)`);
    const bulletTooltip = d3.select(".bullet-tooltip");

    const nodeEnter = nodeWrapper
      .selectAll(".bullet")
      .data(data)
      .enter()
      .append("g")
      .attr(
        "transform",
        (d, i) => `translate(${0},${i * (nodeHeight + 10) + 15})`
      )
      .attr("class", "bullet")
      .call(chart)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        bulletTooltip
          .style("opacity", 1)
          .html(
            `document number:  ${d.measures[0]} <br/> total times: ${d.markers[0].value}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 30 + "px");
      })
      .on("mouseout", () => {
        bulletTooltip.style("opacity", 0);
      });

    nodeEnter
      .append("text")
      .style("text-anchor", "start")
      .attr("transform", `translate(0, ${-nodeHeight / 4})`)
      .attr("class", "title")
      .text(function (d) {
        return d.title;
      });

    function bullet() {
      var orient = "left",
        reverse = false,
        duration = 0,
        ranges = bulletRanges,
        markers = bulletMarkers,
        measures = bulletMeasures,
        width = 380,
        height = 30,
        tickFormat = d3.format(",.1f");

      // For each small multiple…
      function bullet(g) {
        g.each(function (d, i) {
          var markerz = markers.call(this, d, i).slice().sort(d3.descending),
            measurez = measures.call(this, d, i).slice().sort(d3.descending),
            rangez = ranges.call(this, d, i).slice().sort(d3.descending),
            g = d3.select(this);

          // Compute the new x-scale.
          var x1 = d3
            .scaleLinear()
            .domain([0, Math.max(rangez[0], markerz[0].value, measurez[0])])
            .range(reverse ? [width, 0] : [0, width]);

          // Retrieve the old x-scale, if this is an update.
          var x0 =
            this.__chart__ ||
            d3.scaleLinear().domain([0, Infinity]).range(x1.range());

          var markerx0 = (d, i) => {
            return x0(d.value);
          };

          var markerx1 = (d, i) => {
            return x1(d.value);
          };

          var markerColor = (d, i) => {
            return d.color;
          };
          // Stash the new scale.
          this.__chart__ = x1;

          // Derive width-scales from the x-scales.
          var w0 = bulletWidth(x0),
            w1 = bulletWidth(x1);

          // Update the range rects.
          var range = g.selectAll("rect.range").data(rangez);

          range
            .enter()
            .append("rect")
            .attr("class", (d, i) => "range s" + i)
            .attr("width", w0)
            .attr("height", height)
            .attr("x", reverse ? x0 : 0)
            .transition()
            .duration(duration)
            .attr("width", w1)
            .attr("x", reverse ? x1 : 0);

          range
            .transition()
            .duration(duration)
            .attr("x", reverse ? x1 : 0)
            .attr("width", w1)
            .attr("height", height);

          // Update the measure rects.
          var measure = g.selectAll("rect.measure").data(measurez);

          measure
            .enter()
            .append("rect")
            .attr("class", (d, i) => "measure s" + i)
            .attr("width", w0)
            .attr("height", height / 3)
            .attr("x", reverse ? x0 : 0)
            .attr("y", height / 3)
            .transition()
            .duration(duration)
            .attr("width", w1)
            .attr("x", reverse ? x1 : 0);

          measure
            .transition()
            .duration(duration)
            .attr("width", w1)
            .attr("height", height / 3)
            .attr("x", reverse ? x1 : 0)
            .attr("y", height / 3);

          // Update the marker lines.
          var marker = g.selectAll("line.marker").data(markerz);

          marker
            .enter()
            .append("line")
            .attr("class", "marker")
            .attr("x1", (d, i) => markerx0(d, i))
            .attr("x2", (d, i) => markerx0(d, i))
            .attr("y1", height / 6)
            .attr("y2", (height * 5) / 6)
            .style("stroke", (d) => markerColor(d, i))
            .transition()
            .duration(duration)
            .attr("x1", (d, i) => markerx1(d, i))
            .attr("x2", (d, i) => markerx1(d, i));

          marker
            .transition()
            .duration(duration)
            .attr("x1", (d, i) => markerx1(d, i))
            .attr("x2", (d, i) => markerx1(d, i))
            .attr("y1", height / 6)
            .attr("y2", (height * 5) / 6);

          // Compute the tick format.
          // var format = tickFormat || x1.tickFormat(8);

          // // Update the tick groups.
          // var tick = g.selectAll("g.tick").data(x1.ticks(8), function (d) {
          //   return this.textContent || format(d);
          // });

          // // Initialize the ticks with the old scale, x0.
          // var tickEnter = tick
          //   .enter()
          //   .append("g")
          //   .attr("class", "tick")
          //   .attr("transform", bulletTranslate(x0))
          //   .style("opacity", 1e-6);

          // tickEnter
          //   .append("line")
          //   .attr("y1", height)
          //   .attr("y2", (height * 7) / 6);

          // tickEnter
          //   .append("text")
          //   .attr("text-anchor", "middle")
          //   .attr("dy", "1em")
          //   .attr("y", (height * 7) / 6)
          //   .text(format);

          // // Transition the entering ticks to the new scale, x1.
          // tickEnter
          //   .transition()
          //   .duration(duration)
          //   .attr("transform", bulletTranslate(x1))
          //   .style("opacity", 1);

          // // Transition the updating ticks to the new scale, x1.
          // var tickUpdate = tick
          //   .transition()
          //   .duration(duration)
          //   .attr("transform", bulletTranslate(x1))
          //   .style("opacity", 1);

          // tickUpdate
          //   .select("line")
          //   .attr("y1", height)
          //   .attr("y2", (height * 7) / 6);

          // tickUpdate.select("text").attr("y", (height * 7) / 6);

          // // Transition the exiting ticks to the new scale, x1.
          // tick
          //   .exit()
          //   .transition()
          //   .duration(duration)
          //   .attr("transform", bulletTranslate(x1))
          //   .style("opacity", 1e-6)
          //   .remove();
        });
      }

      // left, right, top, bottom
      bullet.orient = function (x) {
        if (!arguments.length) return orient;
        orient = x;
        reverse = orient == "right" || orient == "bottom";
        return bullet;
      };

      // ranges (bad, satisfactory, good)
      bullet.ranges = function (x) {
        if (!arguments.length) return ranges;
        ranges = x;
        return bullet;
      };

      // markers (previous, goal)
      bullet.markers = function (x) {
        if (!arguments.length) return markers;
        markers = x;
        return bullet;
      };

      // measures (actual, forecast)
      bullet.measures = function (x) {
        if (!arguments.length) return measures;
        measures = x;
        return bullet;
      };

      bullet.width = function (x) {
        if (!arguments.length) return width;
        width = x;
        return bullet;
      };

      bullet.height = function (x) {
        if (!arguments.length) return height;
        height = x;
        return bullet;
      };

      bullet.tickFormat = function (x) {
        if (!arguments.length) return tickFormat;
        tickFormat = x;
        return bullet;
      };

      bullet.duration = function (x) {
        if (!arguments.length) return duration;
        duration = x;
        return bullet;
      };

      return bullet;
    }

    function bulletRanges(d) {
      return d.ranges;
    }

    function bulletMarkers(d) {
      return d.markers;
    }

    function bulletMeasures(d) {
      return d.measures;
    }

    function bulletTranslate(x) {
      return function (d) {
        return "translate(" + x(d) + ",0)";
      };
    }

    function bulletWidth(x) {
      var x0 = x(0);
      return function (d) {
        return Math.abs(x(d) - x0);
      };
    }
    return bullet;
  };


  return (
    <>
        <div className="topic-word-bar">
          <div id="topic-word-bar-chart" ref={resizeRef}></div>
        </div>
        <div className="bullet-tooltip"></div>
    </>
  );
};

export default React.memo(TopicWordBar);

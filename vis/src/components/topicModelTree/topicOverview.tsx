import React, { useEffect } from "react";
import * as echarts from "echarts";

const TopicOverview = ({ data, selectTopicId }) => {
  useEffect(() => {
    drawTopicOverview(data, selectTopicId);
  }, [data]);

  const drawTopicOverview = (data, selectTopicId) => {
    if (data.length === 0) return;

    let xDt: string[] = [],
      yDt: { [key: string]: any }[] = [];
    for (let i of data) {
      let topicId = i["topicId"], topicName = i["topicName"], number = i["number"];
      let curColor = topicId == 3? '#e74234': '#aaa';   // 测试
        // let curColor = topicId == selectTopicId? '#e74234': '#aaa';
      xDt.push(topicId);
      yDt.push({
        value: number,
        topicName: topicName,
        itemStyle: {
          color: curColor
        },
      });
    }
    let chartDom = document.getElementById("topic-overview-chart");
    let myChart = echarts.init(chartDom);
    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: function (params) {
          var topicName = params[0].data["topicName"];
          var number = params[0].data["value"];
          return `${topicName}: ${number}`;
        },
      },
      grid: {
        left: 2,
        top: 2,
        right: 2,
        bottom: 5,
      },
      xAxis: {
        type: "category",
        data: xDt,
        show: false,
      },
      yAxis: {
        type: "value",
        show: false,
      },
      series: [
        {
          type: "bar",
          barWidth: "60%",
          data: yDt,
          itemStyle: {
            color: 'gray' // 设置柱状图为灰色
        }
        },
      ],
    };

    option && myChart.setOption(option);
  };

  return (
    <div
      id="topic-overview-chart"
      style={{
        width: "100%",
        height: "100%",
      }}
    ></div>
  );
};

export default React.memo(TopicOverview);

/* eslint-disable no-eval */
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  StarOutlined,
  EyeOutlined,
  CalendarOutlined,
  ForkOutlined,
  DownOutlined,
} from "@ant-design/icons";

import {
  DatePicker,
  Col,
  InputNumber,
  Row,
  Slider,
  Space,
  Button,
  Select,
  Tag,
  Checkbox,
  Tree,
  ConfigProvider,
  Cascader,
} from "antd";
import { filterOptionDt } from "../../utils/testData.ts";
import dayjs from "dayjs";
import { capitalizeFirstLetter } from "../../utils/tool.ts";
import "./index.less";
import { resultFilter } from "../../apis/api.ts";
import { IRes } from "../../utils/type.ts";

const { RangePicker } = DatePicker;

const options = [
  {
    value: "name",
    label: "Name",
  },
  {
    value: "times",
    label: "Times",
  }
];

var width = 0;
var height = 0;
var xDataTime: string[] = [];
const iconMap = {
  star: <StarOutlined />,
  watch: <EyeOutlined />,
  fork: <ForkOutlined />,
};
const iconColorMap = {
  star: "#ffe082",
  watch: "#c5e1a5",
  fork: "#557ebd",
};

// 用于全局过滤的选项
const filterOption = {
  star: 0,
  watch: 0,
  fork: 0,
  dateRange: ["2010-01", "2024-01"],
  matchingOrder: [],
  filterHasHow: false,
  filterLicense: false,
  neededTech: [],
};

interface IControlPanelProps {
  filterOptionDt: {
    timeBar: { [key: string]: any };
    starRange: number[];
    watchRange: number[];
    forkRange: number[];
    matchingOrderDt: string[];
    total_techs_tree_arr: { data: []; max_number: 0 };
  };
  setListResultDt: (p) => void;
  setTopicModelTreeDt: (p) => void;
  setSearchTopicsDt: (p) => void;
  setTopicsOverview: (p) => void;
}

const ControlPanel = (props: IControlPanelProps) => {
  const { filterOptionDt, setListResultDt, setTopicModelTreeDt, setSearchTopicsDt, setTopicsOverview } = { ...props };
  let {
    timeBar,
    starRange,
    watchRange,
    forkRange,
    matchingOrderDt,
    total_techs_tree_arr,
  } = {
    ...filterOptionDt,
  };

  const [techTreeSortedArr, setTechTreeSortedArr] = useState([])
  const tech_color_max_number = total_techs_tree_arr.max_number || 0;
  const resizeRef = useRef(null);
  const [value, setValue] = useState(null);
  const [dateRange, setDateRange] = useState([0, 100]);
  const [starValue, setStarValue] = useState(0);
  const [watchValue, setWatchValue] = useState(0);
  const [forkValue, setForkValue] = useState(0);
  const [selectedSearchWordOrder, setSelectedSearchWordOrder] = useState([]);

  useEffect(() => {
    setTechTreeSortedArr([...total_techs_tree_arr.data])
  }, [total_techs_tree_arr])
  
  useEffect(() => {
    if (JSON.stringify(timeBar) !== "{}") {
      let startTime = "2010-01";
      let endTime = "2024-01";
      if (value != null) {
        startTime = dayjs(value[0]).format("YYYY-MM");
        endTime = dayjs(value[1]).format("YYYY-MM");
      }
      filterOption["dateRange"] = [startTime, endTime]; // 设置全局的时间过滤
    }
  }, [timeBar, value]);

  useEffect(() => {
    if (timeBar && JSON.stringify(timeBar) !== "{}") {
      drawTimeFilterChart(timeBar); // 重新绘制时间刷
    }
  }, [timeBar, dateRange]);

  useEffect(() => {
    if (
      starRange &&
      forkRange &&
      watchRange &&
      starRange?.length !== 0 &&
      watchRange?.length !== 0 &&
      forkRange?.length !== 0
    ) {
      setStarValue(starRange[1]);
      setWatchValue(watchRange[1]);
      setForkValue(forkRange[1]);
    }
  }, [starRange, watchRange, forkRange]);

  useEffect(() => {
    if (timeBar && JSON.stringify(timeBar) !== "{}") {
      setStarValue(0); // 设置时间后 恢复其他过滤条件
      setWatchValue(0);
      setForkValue(0);
      width = Math.floor(resizeRef.current.offsetWidth); // 初始化
      height = Math.floor(resizeRef.current.offsetHeight);
      xDataTime = Object.keys(timeBar).map((d) => d);
      drawTimeFilterChart(timeBar);
    }
  }, [timeBar]);

  const drawTimeFilterChart = (data) => {
    d3.select("#time-filter-chart svg").remove(); // 每次画图前移除多余的元素
    if (JSON.stringify(data) === "{}") return;

    const margin = { top: 10, right: 10, bottom: 20, left: 10 };
    const gWidth = width - margin.left - margin.right; // 初始化
    const gHeight = height - margin.top - margin.bottom;
    const svg = d3
      .select("#time-filter-chart")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height]);

    const wrapperG = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    // 创建比例尺
    const xData = Object.keys(data).map((d, i) => i);
    const [min, max] = d3.extent(Object.keys(data).map((d, i) => +i));
    const xRange = [min, max + 1];
    const yData = Object.values(data);

    const x = d3.scaleLinear().domain(xRange).range([0, gWidth]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(yData)])
      .range([0, gHeight]);
    const rectWidth = gWidth / (xRange[1] - xRange[0]);
    wrapperG
      .append("g")
      .selectAll("rect")
      .data(d3.range(xRange[0], xRange[1] + 1))
      .join("rect")
      .attr("x", (d) => x(d))
      .attr("y", (d) => gHeight - y(data[xDataTime[d]] || 0))
      .attr("width", rectWidth)
      .attr("height", (d) => y(data[xDataTime[d]] || 0))
      .attr("value", (d) => data[xDataTime[d]] || 0)
      .attr("fill", "#e8d52f");
    // 背景线条
    wrapperG
      .append("g")
      .selectAll("line")
      .data(d3.range(xRange[0], xRange[1] + 1))
      .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 0)
      .attr("y1", gHeight)
      .attr("stroke", (d, i) => {
        if (i % 12 === 0) return "rgba(51, 51, 51, 0.3)";
        return "rgba(51, 51, 51, 0.1)";
      })
      .attr("stroke-width", (d, i) => {
        if (i % 12 === 0) return "0.5";
        return "0.3";
      });

    // labels
    wrapperG
      .append("text")
      .attr("id", "label-min")
      .attr("x", "-0.9em")
      .attr("font-size", "0.5em")
      .attr("y", gHeight)
      .text(0);

    wrapperG
      .append("text")
      .attr("id", "label-max")
      .attr("x", "-0.9em")
      .attr("font-size", "0.5em")
      .attr("y", 0)
      .text(d3.max(yData));

    for (let i = 0; i < xData.length; i = i + 25) {
      wrapperG
        .append("text")
        .attr("font-size", "0.5em")
        .attr("class", "bottomLabel")
        .attr("x", x(xData[i]))
        .attr("y", gHeight + 7)
        .attr("font-size", "0.5em")
        .text(xDataTime[i]);
    }

    var labelL = wrapperG
      .append("text")
      .attr("id", "labelleft")
      .attr("dx", 3)
      .attr("fill", "#ce310d")
      .attr("font-size", "0.5em")
      .attr("text-anchor", "start")
      .attr("y", -1);

    var labelR = wrapperG
      .append("text")
      .attr("id", "labelright")
      .attr("x", 0)
      .attr("fill", "#ce310d")
      .attr("text-anchor", "end")
      .attr("font-size", "0.5em")
      .attr("y", -1);

    // 定义brush
    const bucketSize = 1;
    var brush = d3
      .brushX()
      .extent([
        [0, 0],
        [gWidth, gHeight],
      ])
      .on("brush", function (event) {
        var s = event.selection;
        labelL
          .attr("x", s[0])
          .text(xDataTime[Math.round(x.invert(s[0])) * bucketSize]);
        labelR
          .attr("x", s[1])
          .text(xDataTime[(Math.round(x.invert(s[1])) - 1) * bucketSize]);
        // move brush handles
        handle
          .attr("display", null)
          .attr(
            "transform",
            (d, i) => "translate(" + [s[i], -gHeight / 4] + ")"
          );
        // 更新视图
        svg.node().value = s.map(
          (d) => xDataTime[Math.round(x.invert(d)) * bucketSize]
        );
        svg.node().dispatchEvent(new CustomEvent("input"));
      })
      .on("end", function (event) {
        if (!event.sourceEvent) return;
        var d0 = event.selection.map(x.invert);
        var d1 = d0.map(Math.round);
        d3.select(this).transition().call(event.target.move, d1.map(x));

        let labelLText = d3.select("#labelleft")._groups[0][0].innerHTML;
        let labelRText = d3.select("#labelright")._groups[0][0].innerHTML;
        setValue([dayjs(labelLText), dayjs(labelRText)]);
      });

    // 添加brush的g
    var gBrush = wrapperG.append("g").attr("class", "brush").call(brush);

    // 添加brush
    var brushResizePath = function (d) {
      var e = +(d.type == "e"),
        x = e ? 1 : -1,
        y = gHeight / 2;
      return (
        "M" +
        0.5 * x +
        "," +
        y +
        "A6,6 0 0 " +
        e +
        " " +
        6.5 * x +
        "," +
        (y + 6) +
        "V" +
        (2 * y - 6) +
        "A6,6 0 0 " +
        e +
        " " +
        0.5 * x +
        "," +
        2 * y +
        "Z" +
        "M" +
        2.5 * x +
        "," +
        (y + 8) +
        "V" +
        (2 * y - 8) +
        "M" +
        4.5 * x +
        "," +
        (y + 8) +
        "V" +
        (2 * y - 8)
      );
    };

    var handle = gBrush
      .selectAll(".handle--custom")
      .data([{ type: "w" }, { type: "e" }])
      .enter()
      .append("path")
      .attr("class", "handle--custom")
      .attr("stroke", "#999")
      .attr("fill", "#eee")
      .attr("cursor", "ew-resize")
      .attr("d", brushResizePath);

    gBrush
      .selectAll(".overlay")
      .each(function (d) {
        d.type = "selection";
      })
      .on("mousedown touchstart", brushcentered);

    function brushcentered() {
      var dx = x(1) - x(0), // Use a fixed width when recentering.
        cx = d3.pointer(this)[0],
        x0 = cx - dx / 2,
        x1 = cx + dx / 2;
      d3.select(this.parentNode).call(
        brush.move,
        x1 > gWidth ? [gWidth - dx, gWidth] : x0 < 0 ? [0, dx] : [x0, x1]
      );
    }

    // 选择整个范围
    //  gBrush.call(brush.move, xRange.map(x))

    // 设置默认时间范围
    gBrush.call(
      brush.move,
      dateRange
        .map((d) => gWidth * (d / 100))
        .map(x.invert)
        .map(Math.round)
        .map(x)
    );
  };

  // 根据过滤条件在后端过滤结果
  const changeFilter = () => {
    resultFilter({
      star: filterOption.star,
      watch: filterOption.watch,
      fork: filterOption.fork,
      dateRange: filterOption.dateRange,
      matchingOrder: filterOption.matchingOrder,
      filterHasHow: filterOption.filterHasHow,
      filterLicense: filterOption.filterLicense,
      neededTechs: filterOption.neededTech,
    }).then((res: IRes) => {
      if (res.ok) {
        console.log("changeFilter", res.data);
        setListResultDt(res.data.listData);
        setTopicModelTreeDt(res.data.topicModelData);
        setSearchTopicsDt(res.data.searchTopicsDt);
        setTopicsOverview(res.data.topicsOverview);
      } else {
        console.log("changeFilter", res.msg);
      }
    });
  };

  const disabledDate = (current) => {
    return (
      current &&
      (current >= dayjs("2024-01-31").endOf("day") || current <= dayjs("2010"))
    );
  };

  const onStarChange = (newValue: number) => {
    filterOption["star"] = newValue;
    setStarValue(newValue);
  };
  const onWatchChange = (newValue: number) => {
    filterOption["watch"] = newValue;
    setWatchValue(newValue);
  };
  const onForkChange = (newValue: number) => {
    filterOption["fork"] = newValue;
    setForkValue(newValue);
  };

  let starMarks = {
    // 0: {
    //   style: {
    //     color: "black",
    //     fontSize: "0.4vw",
    //     //   top: "-1px",
    //   },
    //   label: 0,
    // },
    [starRange[1]]: {
      style: {
        color: "black",
        fontSize: "0.4vw",
        //   top: "-4px",
      },
      label: starRange[1],
    },
  };

  let forkMarks = {
    // 0: {
    //   style: {
    //     color: "black",
    //     fontSize: "0.4vw",
    //     //   top: "-1px",
    //   },
    //   label: 0,
    // },
    [forkRange[1]]: {
      style: {
        color: "black",
        fontSize: "0.4vw",
        //   top: "-4px",
      },
      label: forkRange[1],
    },
  };

  let watchMarks = {
    // 0: {
    //   style: {
    //     color: "black",
    //     fontSize: "0.4vw",
    //     //   top: "-1px",
    //   },
    //   label: 0,
    // },
    [watchRange[1]]: {
      style: {
        color: "black",
        fontSize: "0.4vw",
        //   top: "-4px",
      },
      label: watchRange[1],
    },
  };

  function onChangeMatchingOrder(value) {
    setSelectedSearchWordOrder(value);
    filterOption["matchingOrder"] = value;
  }

  function onChangeFilterHasHow(e) {
    filterOption["filterHasHow"] = e.target.checked;
  }

  function onChangeFilterHasLicense(e){
    filterOption["filterLicense"] = e.target.checked;
  }

  // 包含的是全部选中的，不是当前选中的
  const onSelectTechTree = (selectedKeys) => {
    filterOption["neededTech"] = selectedKeys.filter((d) => !(d[0] === "$"));
  };

  // 自定义渲染节点标题的函数
  const renderTitle = (nodeData) => {
    let w = "236px";
    return (
      <span
        value={nodeData.number}
        style={{
          width: w,
          display: "inline-block",
          background: `linear-gradient(to right, transparent 0, #f7ce8b ${
            (nodeData.number / tech_color_max_number) * 236
          }px, transparent 0`,
        }}
      >
        {nodeData.title}       <span className="number-subscript">{nodeData.number}</span>
      </span>
    );
  };

  const changeTechOrder = (value: string[]) => {
    let techs = total_techs_tree_arr.data;
    if(value[0] === 'name'){   // 按照名称排序
      techs.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      techs.sort((a, b) => b.number - a.number);
    }
    setTechTreeSortedArr([...techs]);
  }

  function onClearFilter(e) {
    
  }
  return (
    <>
      {/* <div className="filter-left">
        <label className="filter-label">
          <b>Global setting</b>
        </label>
      </div> */}
      {/* <Divider type="vertical" style={{ borderColor: "#1e1e1e" }} /> */}
      <div>
        <div className="number-filter">
          <div className="filter-subtitle">Basic Metrics</div>
          <div className="single-filter">
            <Tag
              className="single-filter-tag"
              icon={iconMap["star"]}
              color={iconColorMap["star"]}
              style={{ color: "black" }}
            >
              star
            </Tag>
            <Space
              style={{
                width: "95%",
              }}
              direction="vertical"
            >
              <Row>
                <Col span={20}>
                  <Slider
                    min={starRange[0]}
                    max={starRange[1]}
                    marks={starMarks}
                    onChange={onStarChange}
                    value={starValue}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    size="small"
                    min={starRange[0]}
                    max={starRange[1]}
                    style={{
                      marginTop: "5px",
                      marginLeft: "10px",
                      width: "45px",
                    }}
                    value={starValue}
                    onChange={onStarChange}
                  />
                </Col>
              </Row>
            </Space>
          </div>
          <div className="single-filter">
            <Tag
              className="single-filter-tag"
              icon={iconMap["fork"]}
              color={iconColorMap["fork"]}
              style={{ color: "black" }}
            >
              fork
            </Tag>
            <Space
              style={{
                width: "95%",
              }}
              direction="vertical"
            >
              <Row>
                <Col span={20}>
                  <Slider
                    min={forkRange[0]}
                    max={forkRange[1]}
                    marks={forkMarks}
                    onChange={onForkChange}
                    value={forkValue}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    size="small"
                    min={forkRange[0]}
                    max={forkRange[1]}
                    style={{
                      marginTop: "5px",
                      marginLeft: "10px",
                      width: "45px",
                    }}
                    value={forkValue}
                    onChange={onForkChange}
                  />
                </Col>
              </Row>
            </Space>
          </div>
          <div className="single-filter">
            <Tag
              className="single-filter-tag"
              icon={iconMap["watch"]}
              color={iconColorMap["watch"]}
              style={{ color: "black" }}
            >
              watch
            </Tag>
            <Space
              style={{
                width: "95%",
              }}
              direction="vertical"
            >
              <Row>
                <Col span={20}>
                  <Slider
                    min={watchRange[0]}
                    max={watchRange[1]}
                    marks={watchMarks}
                    onChange={onWatchChange}
                    value={watchValue}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    size="small"
                    min={watchRange[0]}
                    max={watchRange[1]}
                    style={{
                      marginTop: "5px",
                      marginLeft: "10px",
                      width: "45px",
                    }}
                    value={watchValue}
                    onChange={onWatchChange}
                  />
                </Col>
              </Row>
            </Space>
          </div>
        </div>
        {/* <Divider type="vertical" style={{ borderColor: "#1e1e1e" }} /> */}
        <div id="time-filter">
          <div className="filter-subtitle">Updating Date Selection</div>
          <div className="time-filter-left">
            <Tag
              icon={<CalendarOutlined />}
              color="#ffcc80"
              style={{ color: "black" }}
            >
              Date
            </Tag>
            <div id="time-filter-antd">
              <RangePicker
                picker="month"
                size="small"
                value={value}
                disabledDate={disabledDate}
                onChange={(val) => {
                  if (val === null) {
                    setDateRange([0, 100]);
                    setValue(null);
                  } else {
                    let startIndex = xDataTime.indexOf(
                      val[0].format("YYYY/MM")
                    );
                    let endIndex = xDataTime.indexOf(val[1].format("YYYY/MM"));
                    setValue([
                      dayjs(val[0].format("YYYY/MM")),
                      dayjs(val[1].format("YYYY/MM")),
                    ]);
                    setDateRange([
                      (startIndex / xDataTime.length) * 100,
                      (endIndex / xDataTime.length) * 100 + 0.5,
                    ]);
                  }
                }}
              />
            </div>
          </div>
          <div
            id="time-filter-chart"
            style={{ width: "98%", height: "120px", marginTop: "5px" }}
            ref={resizeRef}
          ></div>
        </div>
        <div className="search-word-filter-container">
          <div className="filter-subtitle">Matching Order Selection</div>
          {/** 关键词的匹配顺序的过滤 */}
          <div className="search-word-filter">
            <span className="search-word-filter-subtitle">Matching order</span>
            <Select
              allowClear
              size="small"
              mode="multiple"
              placeholder="Select topics"
              value={selectedSearchWordOrder}
              onChange={onChangeMatchingOrder}
              style={{ width: "100%", color: "#4ec9b0" }}
              options={matchingOrderDt.map((item) => ({
                value: item, // value是唯一标识符
                label: item
                  .split("-")
                  .map((e) => (
                    <div
                      className={`orderDot css-var-input-span match-div-${e}`}
                    >
                      {e}
                    </div>
                  )),
              }))}
            />
          </div>
        </div>
      </div>

      <div className="tech-tree-container">
        <div className="filter-subtitle">Dependency Selection</div>
        <div className="tech-sorter">
          <div>Sort by&nbsp;</div>
          <Cascader
              size="small"
              options={options}
              onChange={changeTechOrder}
              defaultValue={["name"]}   // 默认按照名称进行排序
              style={{height: '20px', width: '80%'}}
            />
        </div>
        <ConfigProvider
          theme={{
            components: {
              Tree: {
                titleHeight: 22,
              },
            },
            token: {
              lineHeight: 1,
              controlInteractiveSize: 12,
              paddingXS: 2,
            },
          }}
        >
          <Tree
            showLine
            checkable
            height={550}
            switcherIcon={<DownOutlined />}
            onCheck={onSelectTechTree} // 点击复选框发
            titleRender={renderTitle}
            treeData={techTreeSortedArr}
            style={{
              paddingBottom: 0,
            }}
          />
        </ConfigProvider>
      </div>
      <div className="hasHow-filter">
        <Checkbox onChange={onChangeFilterHasHow}>
          Filter without usage guide
        </Checkbox>
        <Checkbox onChange={onChangeFilterHasLicense}>
          Filter without license
        </Checkbox>
      </div>
      <div className="global-filter-button">
        <Button className="global-btn" size="middle" onClick={changeFilter}>
          Execute setting
        </Button>
        <Button className="global-btn" size="middle" onClick={onClearFilter}>
          Clear setting
        </Button>
      </div>
    </>
  );
};

export default React.memo(ControlPanel);

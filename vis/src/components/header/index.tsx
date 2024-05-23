import React, { useEffect, useState } from "react";
import { Input, Checkbox, ConfigProvider, Button } from "antd";
import { ArrowRightOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import "./index.less";

const { Search } = Input;

interface IHeader {
  setShouldQueryInResult: (param: boolean) => void;
  setQuery: () => void;
  uiLeftDirection: boolean;
  setUiLeftDirection: (p) => void;
}

const Header = (props: IHeader) => {
  const {
    setShouldQueryInResult,
    setQuery,
    uiLeftDirection,
    setUiLeftDirection,
  } = {
    ...props,
  };

  // 在文本内容变化的时候自动添加样式
  const onInputChange = (e) => {
    let value = e.target.value;
    const textarea = document.getElementById("colored-input"); // 原本的输入框
    const shadowInput = document.getElementById("shadowInput"); // 高亮的div内容

    let sentence = "";
    value.split(" ").forEach((word, index) => {
      sentence += `<span class=input-span-${index}>${word}</span> `;
    });
    if (shadowInput && textarea) {
      shadowInput.innerHTML = sentence;
      // textarea.classList.add('hidden-input')
    }
  };

  return (
    <>
      <div className="engine-logo">
        <h1>&nbsp;VisRepo</h1>
      </div>
      <div className="search-container">
        <ConfigProvider
          theme={{
            components: {
              Input: {
                colorBgContainer: "transparent",
              },
            },
          }}
        >
          <div className="search-interface colorful-input css-var-input-span">
            <div id="shadowInput" className="highlight-shadow-input"></div>
            <Search
              id="colored-input"
              className="highlight-input"
              placeholder="input search text"
              allowClear
              onSearch={setQuery}
              onChange={onInputChange}
            />
          </div>
        </ConfigProvider>
        {/* <div className="search-interface">
          <Search
            placeholder="Input search text"
            allowClear
            enterButton="Search"
            size="midlle"
            onSearch={searchRepo}
          />
        </div> */}
        <Checkbox
          onChange={(e) => {
            setShouldQueryInResult(e.target.checked);
          }}
        >
          Search in result
        </Checkbox>
        <div className="switchUI">
          <Button
            type="dashed"
            icon={
              uiLeftDirection ? <ArrowRightOutlined /> : <ArrowLeftOutlined />
            }
            onClick={() =>
              setUiLeftDirection((uiLeftDirection) => !uiLeftDirection)
            }
          >
            Switch
          </Button>
        </div>
      </div>
    </>
  );
};

export default React.memo(Header);

import React from "react";
import { Carousel, Image } from "antd";

const ScrollImage = (props: {
  images: string[];
  width: number;
  height: number;
}) => {
  const { images, width, height } = { ...props };
  return (
    <Carousel
      autoplay
      style={{ width: width, height: height, marginBottom: 5 }}
    >
      {!!images && images.map((e) => {
        if(e.indexOf('47.109.60.147') !== -1){
          e = e.replace('47.109.60.147', '47.109.57.143')
        }
        // @ts-ignore
        return <Image width={width} height={height} src={e} />
})}
    </Carousel>
  );
};

export default React.memo(ScrollImage);

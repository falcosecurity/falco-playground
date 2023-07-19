import { CtaDiv, ErrorDiv, SideDiv } from "./sidebar.style";
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyFilled,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Space } from "antd";
import useWasm from "../../Hooks/UseWasm";

const Sidebar = () => {
  const [wasm, loading, error] = useWasm();
  return (
    <SideDiv>
      <CtaDiv>
        <Space direction="vertical">
          <Space wrap size="large">
            <Button
              onClick={async () => {
                const [out, err] = await wasm.main();
                console.log("OUT: " + out);
              }}
              icon={<PlayCircleFilled />}
              type="primary"
              size="large"
            >
              Run
            </Button>
            <Button block icon={<DownloadOutlined />}>
              Download
            </Button>
            <Button block icon={<CopyFilled />}>
              Copy
            </Button>
            <Button block icon={<UploadOutlined />}>
              Upload
            </Button>
          </Space>
        </Space>
      </CtaDiv>
      <ErrorDiv>
        {!loading && error && <p>ERROR: {error.toString()}</p>}
      </ErrorDiv>
    </SideDiv>
  );
};

export default Sidebar;

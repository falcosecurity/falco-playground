import { CtaDiv, ErrorDiv, SideDiv } from "./sidebar.style";
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyOutlined,
  UploadOutlined,
  ClearOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Space, Upload, Dropdown } from "antd";
import useWasm from "../../Hooks/UseWasm";

const items: MenuProps["items"] = [
  {
    key: "1",
    label: (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.antgroup.com"
      >
        1st menu item
      </a>
    ),
  },
  {
    key: "2",
    label: (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.aliyun.com"
      >
        2nd menu item
      </a>
    ),
  },
  {
    key: "3",
    label: (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.luohanacademy.com"
      >
        3rd menu item
      </a>
    ),
  },
];

const Sidebar = () => {
  const [wasm, loading, error] = useWasm();
  return (
    <SideDiv>
      <CtaDiv>
        <Space wrap size="middle">
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
          <Upload showUploadList={false}>
            <Button icon={<UploadOutlined />}>Import Yaml</Button>
          </Upload>
          <Button block icon={<DownloadOutlined />}>
            Download
          </Button>
          <Button block icon={<CopyOutlined />}>
            Copy
          </Button>
          <Dropdown menu={{ items }} placement="bottom">
            <Button icon={<FileOutlined />}>Load Examples</Button>
          </Dropdown>

          <Button icon={<ClearOutlined />}> Clear Console </Button>
        </Space>
      </CtaDiv>
      <ErrorDiv>
        Falco:
        {!loading && error && <p>ERROR: {error.toString()}</p>}
      </ErrorDiv>
    </SideDiv>
  );
};

export default Sidebar;

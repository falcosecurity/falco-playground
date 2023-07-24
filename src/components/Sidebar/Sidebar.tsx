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
import { useState } from "react";
import { FalcoStdOut } from "./falco_output";

interface props {
  code: string;
  example: React.Dispatch<React.SetStateAction<string>>;
}

const Sidebar = ({ code, example }: props) => {
  const [wasm, loading] = useWasm();
  const [error, setError] = useState<string>();
  const [FalcoStd, setFalcoStd] = useState<FalcoStdOut>();
  const handleMenuClick = (items) => {
    example(() => {
      return items.key;
    });
  };
  const items: MenuProps["items"] = [
    {
      key: "1",
      label: <a>Example 1</a>,
    },
    {
      key: "2",
      label: <a>Example 2</a>,
    },
    {
      key: "3",
      label: <a>Example 3</a>,
    },
  ];

  return (
    <SideDiv>
      <CtaDiv>
        <Space wrap size="middle">
          <Button
            onClick={async () => {
              const [out, err] = await wasm.writeFile("rule.yaml", code);
              setFalcoStd(() => JSON.parse(out));
              setError(err);
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
          <Dropdown
            menu={{ items, onClick: handleMenuClick }}
            placement="bottom"
          >
            <Button icon={<FileOutlined />}>Load Examples</Button>
          </Dropdown>

          <Button icon={<ClearOutlined />}> Clear Console </Button>
        </Space>
      </CtaDiv>
      <ErrorDiv>{error != " " ? <p>{error}</p> : ""}</ErrorDiv>
    </SideDiv>
  );
};

export default Sidebar;

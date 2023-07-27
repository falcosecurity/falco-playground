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
import { useEffect, useState } from "react";
import { FalcoStdOut } from "./falco_output";

interface props {
  code: string;
  example: React.Dispatch<React.SetStateAction<string>>;
}

const Sidebar = ({ code, example }: props) => {
  const [wasm] = useWasm();
  const [falcoOut, setFalcoOut] = useState<string>(null);
  const [falcoStd, setFalcoStd] = useState<FalcoStdOut>();
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

  const compileCode = async () => {
    const [jsonOut, stdout] = await wasm.writeFile("rule.yaml", code);
    setFalcoStd(JSON.parse(jsonOut));
    setFalcoOut(stdout);
  };

  useEffect(() => {
    compileCode();
  }, [code]);

  return (
    <SideDiv>
      <CtaDiv>
        <Space wrap size="middle">
          <Button
            onClick={compileCode}
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
      {falcoStd?.falco_load_results[0].errors.length == 0 ? (
        <ErrorDiv>
          <p>Success:{falcoOut}</p>
        </ErrorDiv>
      ) : (
        <ErrorDiv $error>
          <p>Error:{falcoOut}</p>
        </ErrorDiv>
      )}
    </SideDiv>
  );
};

export default Sidebar;

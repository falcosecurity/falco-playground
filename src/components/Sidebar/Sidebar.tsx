import { CtaDiv, ErrorDiv, SideDiv, SpinDiv } from "./sidebar.style";
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
import type { FalcoStdOut, Error } from "./falco_output";

interface props {
  code: string;
  example: React.Dispatch<React.SetStateAction<string>>;
  errJson: React.Dispatch<React.SetStateAction<Error[]>>;
}

const Sidebar = ({ code, example, errJson }: props) => {
  const [wasm, loading] = useWasm();
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
    if (wasm) {
      const [jsonOut, stdout] = await wasm.writeFileAndRun("rule.yaml", code);
      setFalcoStd(JSON.parse(jsonOut));
      setFalcoOut(stdout);
    }
  };

  const conditionallyRenderTerminal = () => {
    if (!falcoStd) {
      return <SpinDiv size="large" />;
    } else if (falcoStd.falco_load_results[0].successful) {
      return (
        <ErrorDiv>
          <p>{falcoOut}</p>
        </ErrorDiv>
      );
    } else {
      return (
        <ErrorDiv $error>
          <p>{falcoOut}</p>
        </ErrorDiv>
      );
    }
  };

  useEffect(() => {
    if (code) {
      compileCode();
    }
  }, [code, loading]);

  useEffect(() => {
    errJson(() => {
      return falcoStd?.falco_load_results[0].errors;
    });
  }, [falcoStd?.falco_load_results[0].errors.length]);

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
            <Button disabled icon={<UploadOutlined />}>
              Import Yaml
            </Button>
          </Upload>
          <Button disabled block icon={<DownloadOutlined />}>
            Download
          </Button>
          <Button disabled block icon={<CopyOutlined />}>
            Copy
          </Button>
          <Dropdown
            menu={{ items, onClick: handleMenuClick }}
            placement="bottom"
          >
            <Button icon={<FileOutlined />}>Load Examples</Button>
          </Dropdown>

          <Button disabled icon={<ClearOutlined />}>
            Clear Console
          </Button>
        </Space>
      </CtaDiv>
      {conditionallyRenderTerminal()}
    </SideDiv>
  );
};

export default Sidebar;

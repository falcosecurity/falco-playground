import { CtaDiv, ErrorDiv, SideDiv, SpinDiv } from "./sidebar.style";
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyOutlined,
  UploadOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Space, Upload, Dropdown } from "antd";
import useWasm from "../../Hooks/UseWasm";
import { useEffect, useState } from "react";
import type { FalcoStdOut, Error } from "./falco_output";

import scap from "/connect_localhost.scap?url";
interface props {
  code: string;
  example: React.Dispatch<React.SetStateAction<string>>;
  errJson: React.Dispatch<React.SetStateAction<Error[]>>;
  uploadCode: React.Dispatch<React.SetStateAction<string | ArrayBuffer>>;
}

const Sidebar = ({ code, example, errJson, uploadCode }: props) => {
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

  const compileWithScap = async () => {
    if (wasm) {
      const data = await fetch(scap);
      const dataBuf = await data.arrayBuffer();
      const [jsonLines, stdout] = await wasm.compileWithScap(
        new Uint8Array(dataBuf),
        code
      );

      for (let jsonLine of jsonLines.split('\n')) {
        if (jsonLine.length > 0 && jsonLine.startsWith("{")) {
          // todo(rohith): put this output somewhere useful
          let falcoAlert = JSON.parse(jsonLine);
          console.log(falcoAlert);
          alert(jsonLine);
        }
      }
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

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadCode(() => {
        return e.target.result;
      });
    };
    reader.readAsText(file);
    return false;
  };

  const handleDownload = () => {
    const file = new Blob([code], { type: "text/plain" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = "rule.yaml";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  useEffect(() => {
    if (code) {
      console.log("compiling");
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
          <Upload
            accept=".yaml"
            beforeUpload={handleUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Import Yaml</Button>
          </Upload>
          <Button onClick={handleDownload} block icon={<DownloadOutlined />}>
            Download
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(code);
            }}
            block
            icon={<CopyOutlined />}
          >
            Copy
          </Button>
          <Dropdown
            menu={{ items, onClick: handleMenuClick }}
            placement="bottom"
          >
            <Button icon={<FileOutlined />}>Load Examples</Button>
          </Dropdown>

          <Button onClick={compileWithScap} icon={<PlayCircleFilled />}>
            Run with scap
          </Button>
        </Space>
      </CtaDiv>
      {conditionallyRenderTerminal()}
    </SideDiv>
  );
};

export default Sidebar;

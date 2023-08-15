import { useEffect, useState } from "react";
import { CtaDiv, ErrorDiv, SideDiv, SpinDiv } from "./sidebar.style";
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyOutlined,
  UploadOutlined,
  FileOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Space, Upload, Dropdown, message, Modal } from "antd";
import * as lzstring from "lz-string";
import useWasm from "../../Hooks/UseWasm";
import type { FalcoStdOut, Error } from "./falco_output";
import scap from "/connect_localhost.scap?url";
interface props {
  code: string;
  example: React.Dispatch<React.SetStateAction<string>>;
  errJson: React.Dispatch<React.SetStateAction<Error[]>>;
  uploadCode: React.Dispatch<React.SetStateAction<string | ArrayBuffer>>;
}

export const encodedYaml = (yaml: string) => {
  return lzstring.compressToBase64(yaml);
};

export const Sidebar = ({ code, example, errJson, uploadCode }: props) => {
  const [wasm, loading] = useWasm();
  const [falcoOut, setFalcoOut] = useState<string>(null);
  const [falcoStd, setFalcoStd] = useState<FalcoStdOut>();
  const [modal, setModal] = useState({ state: false, content: "" });
  const [messageApi, contextHolder] = message.useMessage();

  const handleMenuClick = (items) => {
    message.success("Example" + items.key + " loaded succesfully");
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
      console.log(jsonLines);
      for (const jsonLine of jsonLines.split("\n")) {
        if (jsonLine.length > 0 && jsonLine.startsWith("{")) {
          const falcoAlert = JSON.parse(jsonLine);
          setModal({
            state: true,
            content: JSON.stringify(falcoAlert, null, 10),
          });
          console.log(falcoAlert);
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
        <ErrorDiv className="terminal-success">
          <p>{falcoOut}</p>
        </ErrorDiv>
      );
    } else {
      return (
        <ErrorDiv className="terminal-error" $error>
          <p>{falcoOut}</p>
        </ErrorDiv>
      );
    }
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target.result) {
        messageApi.success("Successfully loaded yaml file");
        uploadCode(() => {
          return e.target.result;
        });
      } else {
        messageApi.error("File is empty or invalid");
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleDownload = () => {
    messageApi.info("Downloading rule.yaml");
    const file = new Blob([code], { type: "text/plain" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = "rule.yaml";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const handleShare = () => {
    const urlConstructor = new URLSearchParams();
    const data = encodedYaml(code);
    urlConstructor.append("code", data);
    const URL = `${window.location.origin}${
      window.location.pathname
    }#/?${urlConstructor.toString()}`;
    navigator.clipboard.writeText(URL);
    message.success("Coppied URL to clipboard");
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
      {contextHolder}
      <Modal
        open={modal.state}
        onOk={() => setModal({ state: false, content: "" })}
        onCancel={() => setModal({ ...modal, state: false })}
        destroyOnClose
        title="Scap Results"
        width={1000}
      >
        <pre
          style={{
            overflowY: "scroll",
            overflowX: "scroll",
          }}
        >
          {modal.content}
        </pre>
      </Modal>
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
              messageApi.success("Code coppied to clipboard");
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
          <Button onClick={handleShare} icon={<ShareAltOutlined />}>
            Share
          </Button>
        </Space>
      </CtaDiv>
      {conditionallyRenderTerminal()}
    </SideDiv>
  );
};

export default Sidebar;

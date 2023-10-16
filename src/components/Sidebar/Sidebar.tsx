// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2023 The Falco Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

import { useEffect, useState } from "react";
import { CtaDiv, ErrorDiv, SideDiv, SpinDiv } from "./sidebar.style";
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyOutlined,
  UploadOutlined,
  FileOutlined,
  ShareAltOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Space, Upload, Dropdown, message, Modal } from "antd";
import * as lzstring from "lz-string";
import useWasm from "../../Hooks/UseWasm";
import type { FalcoStdOut, Error } from "./falco_output";
import scap from "/connect_localhost.scap?url";
import scap2 from "/open-multiple-files.scap?url";
import scap3 from "/syscall.scap?url";
import "./sidebar.css";

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
  const [modal, setModal] = useState({ state: false, content: [""] });
  const [messageApi, contextHolder] = message.useMessage();

  const handleMenuClick = (items) => {
    message.success("Example" + items.key + " loaded succesfully");
    example(() => {
      return items.key;
    });
  };
  const exampleItems: MenuProps["items"] = [
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

  const handleScapClick = (items) => {
    switch (items.key) {
      case "1":
        message.info("Compiling with connect_localhost.scap");
        console.log(scap);
        compileWithScap(scap, "");
        break;
      case "2":
        message.info("Compiling with open_multiple_files.scap");
        compileWithScap(scap2, "");
        break;
      case "3":
        message.info("Syscall.scap");
        compileWithScap(scap3, "");
        break;
      default:
        break;
    }
  };

  const scapItems: MenuProps["items"] = [
    {
      key: "1",
      label: <a>Connect_localhost.scap</a>,
    },
    {
      key: "2",
      label: <a>Open_multiple_files.scap</a>,
    },
    {
      key: "3",
      label: <a>Syscall.scap</a>,
    },
  ];

  const compileCode = async () => {
    if (wasm) {
      const [jsonOut, stdout] = await wasm.writeFileAndRun("rule.yaml", code);
      setFalcoStd(JSON.parse(jsonOut));
      setFalcoOut(stdout);
    }
  };

  const compileWithScap = async (scapFile, buffer) => {
    const scapArr = [];
    if (wasm) {
      const data = await fetch(scapFile);
      const dataBuf = await data.arrayBuffer();
      let jsonLines;
      if (buffer) {
        const [jlines, stdout] = await wasm.compileWithScap(
          new Uint8Array(buffer),
          code
        );
        jsonLines = jlines;
        setFalcoOut(stdout);
      } else {
        const [jlines, stdout] = await wasm.compileWithScap(
          new Uint8Array(dataBuf),
          code
        );
        jsonLines = jlines;
        setFalcoOut(stdout);
      }
      for (const jsonLine of jsonLines.split("\n")) {
        if (jsonLine.length > 0 && jsonLine.startsWith("{")) {
          const falcoAlert = JSON.parse(jsonLine);
          scapArr.push(JSON.stringify(falcoAlert, null, 10));
        }
      }
    }
    if (scapArr.length) {
      setModal({ state: true, content: scapArr });
    } else {
      setTimeout(() => {
        message.info("No events detected from scap file");
      }, 3000);
    }
  };

  const conditionallyRenderTerminal = () => {
    if (!falcoStd) {
      return <SpinDiv size="large" />;
    } else if (falcoStd.falco_load_results[0].successful) {
      return (
        <ErrorDiv className="terminal-success ">
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

  const handleScapUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target.result) {
        messageApi.success(`Compiling with ${file.name}`);
        compileWithScap("", e.target.result);
      } else {
        messageApi.error("File is empty or invalid");
      }
    };
    reader.readAsArrayBuffer(file);
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
    const URL = `${window.location.origin}${window.location.pathname
      }#/?${urlConstructor.toString()}`;
    navigator.clipboard.writeText(URL);
    message.success("Copied URL to clipboard");
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
  }, [
    falcoStd === undefined
      ? undefined
      : Object.values(falcoStd?.falco_load_results[0].errors),
  ]);

  return (
    <SideDiv>
      {contextHolder}
      <Modal
        open={modal.state}
        onOk={() => setModal({ ...modal, state: false })}
        onCancel={() => setModal({ ...modal, state: false })}
        destroyOnClose
        title="Scap Results"
        width={1000}
      >
        {modal.content.map((item, idx) => {
          return (
            <pre
              key={idx}
              style={{
                overflowY: "scroll",
                overflowX: "scroll",
              }}
            >
              {item}
            </pre>
          );
        })}
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
            accept=".yaml,.yml"
            beforeUpload={handleUpload}
            showUploadList={false}
          >
            <Button className="btn" icon={<UploadOutlined />}>Import Yaml</Button>
          </Upload>
          <Button className="btn" onClick={handleDownload} block icon={<DownloadOutlined />}>
            Download
          </Button>
          <Button className="btn"
            onClick={() => {
              messageApi.success("Code copied to clipboard");
              navigator.clipboard.writeText(code);
            }}
            block
            icon={<CopyOutlined />}
          >
            Copy
          </Button>
          <Dropdown className="btn"
            menu={{ items: exampleItems, onClick: handleMenuClick }}
            placement="bottom"
          >
            <Button className="btn" icon={<FileOutlined />}>Load Examples</Button>
          </Dropdown>
          <Dropdown menu={{ items: scapItems, onClick: handleScapClick }}>
            <Button className="btn" icon={<PlayCircleFilled />}>
              <Space>
                Run with scap
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          <Button className="btn" onClick={handleShare} icon={<ShareAltOutlined />}>
            Share
          </Button>
          <Upload
            accept=".scap"
            beforeUpload={handleScapUpload}
            showUploadList={false}
          >
            <Button className="btn" icon={<UploadOutlined />}>Upload scap and run</Button>
          </Upload>
        </Space>
      </CtaDiv>
      {conditionallyRenderTerminal()}
    </SideDiv>
  );
};

export default Sidebar;

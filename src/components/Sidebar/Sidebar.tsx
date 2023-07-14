import { CtaDiv, ErrorDiv, SideDiv } from "./sidebar.style"
import {
  PlayCircleFilled,
  DownloadOutlined,
  CopyFilled,
  UploadOutlined,
} from "@ant-design/icons"
import { Button, Space } from "antd"

const Sidebar = () => {
  return (
    <SideDiv>
      <CtaDiv>
        <Space direction="vertical">
          <Space wrap size="large">
            <Button icon={<PlayCircleFilled />} type="primary" size="large">
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
      <ErrorDiv>some errors</ErrorDiv>
    </SideDiv>
  )
}

export default Sidebar

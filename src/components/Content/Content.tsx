import { Section } from "./content.style";
import Monaco from "../Editor/Monaco";
import Sidebar from "../Sidebar/Sidebar";

const Content = () => {
  return (
    <Section>
      <Monaco />
      <Sidebar />
    </Section>
  );
};

export default Content;

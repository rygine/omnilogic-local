export type SysInfoComponent = {
  devName: string;
  type: string;
  // Hayward Unique Address
  hua: string;
  version: string;
  // -1 for the MSP itself
  nodeId: number;
  // this board's system id in the config, or -1 when it has none
  systemId: number;
  upgradeCapable: boolean;
};

export type SysInfo = {
  numComponents: number;
  components: SysInfoComponent[];
};

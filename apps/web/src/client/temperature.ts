// a Mantine color from blue (cold) to red (hot), over °F
export const tempColor = (f: number): string => {
  if (f < 60) {
    return "blue";
  }
  if (f < 70) {
    return "cyan";
  }
  if (f < 80) {
    return "teal";
  }
  if (f < 90) {
    return "orange";
  }
  return "red";
};

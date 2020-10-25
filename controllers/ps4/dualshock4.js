const HID = require("node-hid");

export function rumble(usb, enable) {
  const rumbleNumber = enable ? 1 : 0;
  const rumbleData = [5, 255, 4, rumbleNumber, rumbleNumber, 0, 0, 0, 0, 0, 0];
  usb.write(rumbleData);
}

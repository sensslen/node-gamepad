const HID = require("node-hid");

export function rumbleSet(usb, left, right) {
  const rumbleData = [5, 255, 4, left, right, 0, 0, 0, 0, 0, 0];
  usb.write(rumbleData);
}

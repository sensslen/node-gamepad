# node-gamepad

> node-gamepad is a package for node that allows you to effortlessly interface your node applications with a variety of gamepad controllers.

## Installation

```js
npm install @sensslen/node-gamepad
```

### Supported Controllers

1. snes/tomee
1. snes/retrolink
1. ps3/dualshock3
1. ps4/dualshock4
1. n64/retrolink
1. logitech/rumblepad2
1. logitech/dualaction
1. logitech/gamepadf310
1. logitech/gamepadf710
1. microsoft/sidewinder-precision-2

## How to Use

Plug in a supported controller and run a variation of the code below (with an actual supported controller).
Slternatively you can also run the code below and then plug in a supported controller.

### Code Example

```ts
import { NodeGamepad } from 'node-gamepad';
import * as f310 from 'node-gamepad/controllers/logitech/gamepadf310';

let gamepad = new NodeGamepad(f310);

gamepad.start();

gamepad.on('connected', function () {
    console.log('connected');
});
gamepad.on('disconnected', function () {
    console.log('disconnected');
});

gamepad.on('up:press', function () {
    console.log('up');
});
gamepad.on('down:press', function () {
    console.log('down');
});

// dont forget to stop when you are finished: gamepad.stop()
// the gamepad class also registers for app termination just in case
```

## Supported Events

This package supports up to 3 different types of components: joysticks, buttons and statuses (like battery level, charging, etc). It's possible that a controller could make use of all 3 different components or even introduce additional components. The idea here is the dictionary file will dictate how the controller will be used and how to read data from it.

### Joysticks

1. `{name}:move` - When fired, this joystick event will provide a `JoyStickValue` object value.

### Buttons

1. `{name}:press` - No data is attached to this callback but it serves the purpose of notifying the developer that a button has been pressed.
1. `{name}:release` - No data is attached to this callback but it serves the purpose of notifying the developer that a button (that was previously pressed) has been released.

### Statuses

A status value is read from a pin on the hardware and then can be mapped to a "state" (based on the dictionary file). See [this example](https://github.com/sensslen/node-gamepad/blob/master/controllers/ps3/dualshock3.json#L136) for more information.

1. `{name}:change`

## Contributing Controllers

Please feel free to provide your own custom controller
configurations to the constructor. It would b highly appreciated if you make the configuration publically available by opening a pull request.

## License

The MIT License (MIT)

Copyright (c) 2021 Simon Ensslen and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

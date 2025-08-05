# node-gamepad [![CodeFactor](https://www.codefactor.io/repository/github/sensslen/node-gamepad/badge)](https://www.codefactor.io/repository/github/sensslen/node-gamepad)

`node-gamepad` is a Node.js package for interfacing your applications with a variety of gamepad controllers. It is written in TypeScript and provides type definitions for a better development experience.

> **Note:** XBOX 360 Controllers (and all of their derivatives) are known to behave badly and are **not supported** by this library.

## Installation

```sh
npm install @sensslen/node-gamepad
```

### Supported Controllers

The following controllers are actively maintained and tested:

- Logitech Rumblepad 2
- Logitech Gamepad F310
- Logitech Gamepad F710

You can also create your own controller definitions by providing a custom configuration to the constructor. Contributions for additional controller support are welcome!


## How to Use

Plug in a supported controller and run a variation of the code below (with an actual supported controller). Alternatively, you can also run the code below and then plug in a supported controller.

### TypeScript Example

```ts
import { NodeGamepad } from '@sensslen/node-gamepad';
import * as f310 from '@sensslen/node-gamepad/controllers/logitech/gamepadf310';

const gamepad = new NodeGamepad(f310);

gamepad.start();

gamepad.on('connected', () => {
  console.log('connected');
});
gamepad.on('disconnected', () => {
  console.log('disconnected');
});

gamepad.on('up:press', () => {
  console.log('up');
});
gamepad.on('down:press', () => {
  console.log('down');
});

// Don't forget to stop when you are finished:
// gamepad.stop();
// The gamepad class also registers for app termination just in case.
```


> **Note:** Type definitions are included for all event handlers and configuration objects. JavaScript users also benefit from improved autocompletion and documentation in modern editors.


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


You are welcome to provide your own custom controller configurations to the constructor. Contributions of new controller definitions are highly appreciated. Please consider making them publicly available by opening a pull request.

---

> **Note:** This project is written in [TypeScript](https://www.typescriptlang.org/), providing type definitions and improved editor support. It can be used from both TypeScript and JavaScript projects. Type definitions are included for all event handlers and configuration objects. JavaScript users also benefit from improved autocompletion and documentation in modern editors.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

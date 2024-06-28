# midi-mixer
This is the `v2.1` branch.  
Map your midi controller  
Utility to map OSC send and receive with a MIDI controller. A JS file is used to configure the object.  
Support for multiple pages, screens, fader touch and different fader mappings is integrated.  

## Installing
Clone the repo, `cd midi-mixer` then `npm install && npm run dev`.  

## JS Syntax
- **channel** : [number] fader used on your midi device
  + 0 is master fader
  + channel > 8 can be accessed by pressing the "next page" button
- **name** : [string] name printed on device screen
- **scale** : [function / table] - transfert function used to convert slider value to sound-related value
  - espace de départ entre 0 et 1
- **osc** : [string] share param in OSC
- **max** : [string] send/receive name in Max
- **default** : [number] default value

## Global parameters
- Midi In : midi port to communicate with
- Midi Out : midi port to communicate with
- OSC dest : OSC address to send 
- OSC send : OSC port to send
- OSC recv : OSC port to receive

## Midi support
The MIDI part of the software uses the Mackie-Control protocol, which is compatible with plenty of MIDI devices (BCF2000, XTouch, Asparion D400, Avid S1, etc.). 
Please set up your MIDI device in Mackie-Control mode before using the software.  

## Configuration of the server
Port, subpath, https and password can be changed by running `npx soundworks --create-env` into the main directory.  


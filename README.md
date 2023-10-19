# midi-mixer
This is `no-max` branch.  
Map your midi controller  
Utility to map OSC send and receive with a MIDI controller. A json file is used to configure the object.  
Support multiple pages, screen, fader touch and diffrent fader mappings are integrated.  

# Installing
Clone the repo, `cd midi-mixer/midi-mixer/midi-mixer` then `npm install && npm run dev`.  

# Syntax
- Channel - number - fader used on your midi device
  + 0 is master fader
  + channel > 8 can be accessed by pressing "next page" button
- name - string - name printed on device screen
- type - "linear" / "volume"
  + linear allow you to define range parameter
  + volume allow you direct volume mapping. linear2dB convertion is done by the mapping scrolling menu.
    * feel free to add mapping tables here `midi-mixer/midi-mixer/src/server/controllers/`
    * files contains : fader variable, array, each index is a midi value, value is the decibel who correspond to the midi value. meter variable (not implemented yet...)
- range - array - [minimum value - maximum value]. work only with linear type  
- oscAddress - string - share param in OSC
- default - number - default value on startup

# Global parameters
- Midi In : midi port to communicate with
- Midi Out : midi port to communicate with
- Mapping : linear / dB conversion for matching midi device
- OSC dest : OSC address to send 
- OSC send : OSC port to send
- OSC recv : OSC port to receive

# Midi support
The MIDI part of the software use the Mackie-Control protocol, compatible with plenty of MIDI device (BCF2000, XTouch, Asparion D400, Avid S1, etc..)  
Please set up your midi device in Mackie-Control mode before using the software.  

# Storing presets
There is a folder to retrieve presets in `midi-mixer/midi-mixer/midi-config` 

# Roadmap
* clip sended values  
* interpolation inside mapping table  

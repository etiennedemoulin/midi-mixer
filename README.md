# midi-mixer
This is `no-max` branch.  
Map your midi controller  
Utility to map OSC send and receive with a MIDI controller. A json file is used to configure the object.  
Support multiple pages, screen, fader touch and diffrent fader mappings are integrated.  

# Installing
Clone the repo, `cd midi-mixer/midi-mixer/midi-mixer` then `npm install && npm run dev`.  

# Midi support
The MIDI part of the software use the Mackie-Control protocol, compatible with plenty of MIDI device (BCF2000, XTouch, Asparion D400, Avid S1, etc..)  
Please set up your midi device in Mackie-Control mode before using the software.  

# Storing presets
There is a folder to retrieve presets in `midi-mixer/midi-mixer/midi-config` 

# Roadmap
* clip sended values  
* interpolation inside mapping table  

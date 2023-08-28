# midi-mixer
Map your midi controller  
Utility to map send and receive objects with a MIDI controller. A json file is used to configure the object.  
Support multiple pages, screen, fader touch and diffrent fader mappings are integrated.  
This is `no-max` branch.  

# Installing
Clone the repo, then `npm install && npm run dev`.  

# Midi support
The MIDI part of the software use the Mackie-Control protocol, compatible with plenty of MIDI device (BCF2000, XTouch, Asparion D400, Avid S1, etc..)  
Please set up your midi device in Mackie-Control mode before using the software.  

# Storing presets
There is a folder to retrieve presets in `midi-mixer/javascript/midi-config` 


# Using it with other music software with OSC (puredata, supercollider)
Follow the `Running outside of Max` section  
Create an OSC Server from your software on 127.0.0.1:3334  
Create an OSC Client listening on port 3333.  
Send values : `/track/[channel]/fader/[type] value`  
Link config file : `/config/filename /Users/toto/Desktop/myconfig.json`  
Change MidiIN/OUT device : `/config/port "IAC Driver Bus 1"`  
Change Mapping : `/config/controller mackie`  

You'll receive the following infos from the server:  
a track is created `/track/create channel`  
a track is removed `/track/remove channel`  
a track has a name `/track/[channel]/name name`  
Receive values `/track/[channel]/fader/[type] value`  
Server is ready `/ready`  
Exiting server `/exit`  

# Roadmap
* clip sended values  
* interpolation inside mapping table  

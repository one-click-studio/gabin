How To: Use MIDI Detection
==========================

Gabin may directly listen to audio devices to analyse vocal activity. It can also delegate this job to another software. To do so, it can be connected to one or several MIDI device, so they can send signals to Gabin about voice activity they had detected.

## What is MIDI?

MIDI is a protocol, originally used in the music production industry to allow digital instruments and devices to communicate between each others. Instruments and devices may exchange messages like "this note starts to play", "this other note has been released", "this control has been set to this value", etc.

## Which software to use?

In this documentation, we will take the example of [Reaper](https://www.reaper.fm/). Reaper is a DAW (Digital Audio Workstation), a software dedicated for audio and music production. Here, it will be used as a virtual mixing console. You may use any other software able to process audio in real time.

Typically, you will use Reaper (or any other DAW) like this:

    +-------+  +-------+       +-------+
    | MIC 1 |  | MIC 2 | . . . | MIC n |
    +-------+  +-------+       +-------+
        |          |               |
        v          v               v
    +----------------------------------+
    | SOUND CARD DEVICE                |
    +----------------------------------+
                     |--USB
                     v
    +----------------------------------+
    | COMPUTER       |                 |
    |                v                 |
    |  +----------------------------+  |
    |  | REAPER (or any other DAW)  |  |
    |  +----------------------------+  |
    |                |--MIDI *         |
    |                v                 |
    |  +----------------------------+  |
    |  | GABIN                      |  |
    |  +----------------------------+  |
    |                |--Websockets     |
    |                v                 |
    |  +----------------------------+  |
    |  | OBS (or anything else)     |  |
    |  +----------------------------+  |
    |                                  |
    +----------------------------------+

\* Windows users, be careful! You will need a software to loopback MIDI signals coming out from Reaper to send them to Gabin. We will see this after.
(Currently, while I'm writing this documentation, I don't know how does it work with Linux or Mac OS).

## Configure your DAW to listen to your microphones

### First steps: plug and configurations

First, you will need to plug your microphones to your sound card and check if the signal is correct. A lot of sound cards are able to redirect input signals to headphones, so you can check the volume of each microphone. You will be able to fine tune sound in your DAW, just be sure to not send an audio too loud, to avoid clipping.

Remember that your sound card has been sold with a user manual. Read it, you will learn many things you probably ignore 🙂

Then, you will have to choose the right soundcard into your DAW. When you use external sound cards, it is strongly recommended to use "ASIO Drivers" (available on the website of the manufacturer or sometimes on a CD).

Using Reaper, you will have to go to the menu "Options" > "Preferences…". Then, in the side navigation, go to "Audio > Device". You may choose your Audio system "ASIO", then choose the ASIO Driver of your sound card, and finally, the number of inputs and outputs to use.

Please note that for every sound card, an input (or output) is associated to one, and only one audio signal. If you need to use a stereo signal, it will take 2 audio inputs (or outputs).

### Create some tracks

Now, you will have to create audio tracks. An audio track is a way where you audio signal will go through. Each track may be plugged to one or many audio inputs or outputs, and it may send audio to other tracks, but… let's keep it simple for now.

With Reaper, you can create new tracks clicking on the menu "Track" > "Insert new Track". Repeat the operation as many as times as the number of microphones you have.

For each track, you will now have to choose the right microphone. To do so with Reaper, you can right-click on the vu-meter of the track, and select "Input: Mono" and choosing the first channel. It will often have the name of your sound card, followed by a number. Typically, the channel 1, where you plugged your first microphone will be named like this: "My Sound Card - Input #1".

Now, you may click on the big record button (red) on each track, and if everything has been correctly configured, you may start to see a signal activity in the vu-meter when you speak into a microphone.

## Detect vocal activity

Now, let's add a vocal activity detector. To do so, we will use a gate effect, included with Reaper as a VST.

### What is a gate?

A gate is an effect that will allow only loud audio signals to be played and will cut low signals. Here is a classical representation of this effect:

    OUTPUT
      |         /
      |        /
      |       /
      |      /
      |     /
      |    |
      |    |
      +----------- INPUT

Every noise under a defined level won't be heard. Everything above will be played.

A gate have several controls to fine tune the effect. The most important ones are:

- Attack: the time the loud audio signal has to last, so it will "open" the gate
- Release: the time after the loud audio signal, before "closing" the gate
- Threshold: the reference level of the audio signal. Below this threshold, audio level will be considered as noise, above, it will be considered as a signal to be kept.

### What is a VST?

A VST is a plugin used to process the sound (to add some echo for example) or to generate sounds (thus, it's called VSTi) like synthesizers, samplers or virtual instruments.

### How to add a gate to a track

To do so, click on the left part of the FX button of a track. Then, click on the menu "FX" > "Add FX" of the window that have been opened. Search for the plugin called "VST: ReaGate (Cockos)", select it, then add it by clicking on the "Add" button.

### Configuration the vocal activity detection

Now you know how a gate works, let's see how the Reaper version of this plugin is great!

First, when you talk in your microphone, you will see a vu-meter moving on the left of the plugin window. This vu-meter surround a slider to control the threshold value. We recommend to put a value just between the noise level of your microphone and the voice level. Be careful:

- A threshold too high will not detect some words pronounced at a low level
- A threshold too low will detect some noises as a valid vocal activity

You may adjust the reactivity of the plugin by adjusting attack and release values. Other sliders may be useful, but please refer to the documentation to adjust it.

Just saying, Lowpass and Highpass may be respectively adjusted to values about 1000-2000Hz and 50-150Hz. These sliders will make the gate more accurate to detect only voice frequencies.

Please note that here, we concentrate on vocal detection. We will see how to redirect microphones sounds to OBS at the end of this documentation. But you may use Reaper to process microphone sounds with effects like compressors, equalizers, etc. But if you know how to use these effects, I guess you already know how a gate works. So we won't see how to process the microphone sounds in this documentation 🙂

## Connect Reaper to Gabin

To connect Reaper to Gabin, using a Windows environment, you will need to setup a very small tool called ["loopMIDI"](https://www.tobias-erichsen.de/software/loopmidi.html) by Tobias Erichsen. Once you have installed it on your system, launch it.

You will just need to type some port name in the bottom right input. For example "GabinMIDI". Then click on the "+" button at the bottom left.

And, that's it! Just let it run in background. Please note that if you checked all checkboxes when you installed loopMIDI, it will start with Windows automatically.

### The Reaper side

First, you will have to plug Reaper to the virtual MIDI device. Open the Reaper preferences, go to "Audio > MIDI Devices". Double-click on the virtual MIDI device (here, named "GabinMIDI") and check "Enable output to this device".

Then, on each track, click on the button with 3 bold slanting bars (named "Route" in some Reaper skins), just below the "S" button, next to the volume fader. Into the opened window, a section named "MIDI Hardware Output" at the top right allows you to plug the track to the virtual MIDI device. Select the output "GabinMIDI" and choose the first channel.

To finish, click on the ReaGate button at the top of the track. It will reopen the settings of the gate. You may see a checkbox named "Send MIDI on open/close". Enable it. Type any number you want in the "note" field. Typically, you can use 0 for the first track, 1 for the second, 2 for the third, etc. Finally, check that the number 1 is set to the "channel" field.

Now, anytime you speak into your microphone a MIDI signal will be sent to the virtual MIDI device. And anytime you will stop talking another MIDI signal will be sent.

Let's take a look to these signals. When you start talking into your microphone, a MIDI signal containing the following information will be sent:

- Note: On
- Channel: 1
- Note: 0

This signal is similar to a key press on the lowest note of a piano keyboard.

When you stop talking, these values will be sent:

- Note: Off
- Channel: 1
- Note: 0

It is similar to a key release of the same note.

### The Gabin side

When Gabin asks you to configure audio devices, you will see MIDI devices. You can now choose "GabinMIDI - Channel 1". When selected, a bunch of buttons will appear, representing the 128 available notes. Just select the notes you have configured in ReaGate instances.

When Gabin will be running, you will now see voice activity in Gabin each time a microphone triggers its gate effect! 🥳

## Redirect Reaper sound to OBS

You may have noticed that now, microphones are only available to Reaper. ASIO drivers are often exclusive. But Reaper has more than one trick up his sleeve.

### The Reaper side

Did you notice that a track named "MASTER" already present when you started Reaper? All the microphone signals are gathered and redirected to the MASTER track by defaut. Let's use it to send the audio signals to OBS.

Open the FX chain, by clicking on the left part of the FX button of the MASTER track. Add the effect "ReaStream". Configure it with the following parameters:

- Identifier: Mics (for example)
- Select "Send audio/MIDI; IP"
- Choose "* local broadcast" into the combobox

Now, the audio signals will be broadcast to your local network.

### The OBS side

We will need a small trick to receive the sound into OBS.

First, you will have to install Reaper VST plugins (it's free!) to your system. Please visit [the dedicated page](https://www.reaper.fm/reaplugs/). Download the 64-bit version, and install it. Be careful! When the setup will ask for a path where to setup the plugins, choose one in the supported paths list ([see here](https://obsproject.com/kb/vst-2-x-plugin-filter)).

You may need to reboot OBS after that.

Then, you will have to create a source that may produce audio. For example, we can use a browser source configured like this:

- URL: about:blank (an empty page)
- Check the field "Control Audio via OBS"

Save the source, then right click on it and choose "Fitlers".

In the top left zone (named "audio filters"), add a "VST 2.x plugin" and choose the plugin "reastream-standalone". Configure the settings using the following details:

- Identifier: Mics
- Select "Receive audio/MIDI"

Now, when you will talk into a microphone, the sound must be redirected to OBS! 🥳
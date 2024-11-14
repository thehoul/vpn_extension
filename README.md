# VPN extension

Simple VPN extension for Ubuntu to automatically connect to a Wireguard VPN by a press of a button. This was developed with the intent of facilitating connecting often without the need to use the command line.


## To use

The `Indicator` class inside the `extension.js` file represents a network to connect to. At the bottom in the `Extension` class, the name of the network can be modified. Mine is "vipiN". Then when clicking on the extension button, it will run the command `nmcli connection up/down target` where `up/down` will depend on the current status to toggle on and off and `target` is the name of the network. In theory, this should work for any network, not only a Wireguard VPN but I only tested with Wireguard.

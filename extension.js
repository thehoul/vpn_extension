/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St } = imports.gi;
const Gio = imports.gi.Gio;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const connected_icon = new St.Icon({
    //icon_name: 'vpn_connected',
    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_connected.svg'),
    style_class: 'system-status-icon',
});

const disconnected_icon = new St.Icon({
    //icon_name: 'vpn_disconnected',
    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_disconnected.svg'),
    style_class: 'system-status-icon',
});

// Use to create a string from a ByteArray
const decoder = new TextDecoder();

const base_cmd = 'nmcli connection'

let timeout;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    /**
     * 
     * @param {string} targets Name of the targets VPN connections
     */
    _init(targets) {
        super._init(0.0, _('My Shiny Indicator'));

        this.connected = false;
        this.targets = targets;

        this.add_child(disconnected_icon);

        if(targets.length == 0){
            let item = new PopupMenu.PopupMenuItem(_(`No devices available`));
            this.menu.addMenuItem(item);
        }

        targets.forEach((target) => {
            let item = new PopupMenu.PopupMenuItem(_(`Connect to ${target.name}`));
            item.connect('activate', () => {
                target._toggle_connect();
            });
            this.menu.addMenuItem(item);
        })



    }

    /**
     * Show an error notification containing the given error text.
     * @param {string} err_str Error string representation
     */    
    static report_error(title, err_str){
        Main.notifyError(title, err_str);
        console.log(title + ": ", err_str);
    }

    static report_info(title, message){
        Main.notify(title, message);
        console.log(title+": ", message);
    }

    /**
     * Modify icon to match the current state of the connection
     */
    _update_icon(){
        this.remove_all_children();
        if(this.connected){
            this.add_child(connected_icon);
        } else {
            this.add_child(disconnected_icon);
        }
    }

    update_connected(){
        this.connected = false;
        this.targets.forEach((target) => {
            if(target.state){
                this.connected = true;
            }
        })
    }

    check_states(){
        this.targets.forEach((target) => target.check_state());
        this.update_connected();
        this._update_icon();
    }
});

class Target {
    constructor(name){
        this.name = name;
        this.state = Target._parse_state(this.name);
    }

    static _parse_state(name){
        var [ok, out, err, _] = GLib.spawn_command_line_sync('nmcli connection show --active');
        if(ok && err.length == 0){
            let lines = state_str.split('\n');
            let active = false;
            lines.forEach((line) => {
                let tokens = line.split(/\s+/);
                console.log(tokens);
                if(tokens[0] == name){
                    active = true;
                }
            });
            return active;
        } else {
            Indicator.report_error("Couldn't verify connection state", decoder.decode(err));
        }
    }

    /**
     * Set the connection of the given target to up if down or to down if up
     * @param {string} target name of the target connection to toggle
     */
    _toggle_connect(){
        let cmd = base_cmd + " " + (this.state?'down':'up') + " " + this.name;
        console.log(cmd);
        var [_, out, err, _] = GLib.spawn_command_line_sync(cmd);

        // Check if the cmd worked
        if(out.length == 0 && err.length > 0){
            // Didn't work so report the error we got and do nothing else
            Indicator.report_error("Couldn't toggle VPN connection", decoder.decode(err));
        } else {
            this._update_state(!this.state);
        }
    }

    check_state(){
        if(this == null){
            console.log("This is null");
            return true;
        }
        let state = Target._parse_state();
        if(this._update_state(state)){
            Indicator.report_info("Connection state updated", `The state of the connection ${this.target} changed unexpectedly to ${state}`);
        }
        return true;
    }

    /**
     * Update the connection state to be the one given. This takes care of updating everything needed in the object (for instace the icon)
     * @param {boolean} new_state new state connetion state (true = connected, false = disconnected)
     * @returns {boolean} true if the state was update and false if the given state is already the current one
     */
    _update_state(new_state){
        if(this.state == new_state){
            return false;
        }
        this.state = new_state;
        return true;
    }
}
class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);

    }

    enable() {
        this._indicator = new Indicator(Extension._find_connections());
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        Mainloop.source_remove(this.timeout);
    }

    set_timeout(timeout){
        this.timeout = timeout;
    }

    check_states(){
        this._indicator.check_states();
        return true;
    }

    static _find_connections(){
        var [ok, out, err, _] = GLib.spawn_command_line_sync('nmcli connection show');
        if(ok && err.length == 0){
            let devices = [];
            let out_str = decoder.decode(out);
            let lines = out_str.split("\n");
            lines.forEach((line) => {
                let tokens = line.split(/\s+/);
                if (tokens[2] == 'wireguard'){
                    devices.push(tokens[0]);
                }
            })

            let targets = [];
            devices.forEach((dev) => targets.push(new Target(dev)));
            console.log(`Found ${devices.length} connections`);
            return targets;
        }
        
        console.log("Couldn't fetch devices: ", decoder.decode(err));
        return null;
    }
}

function init(meta) {
    let extension = new Extension(meta.uuid);
    this.timeout = Mainloop.timeout_add_seconds(5.0, () => extension.check_states());
    
    return extension;
}

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

const base_cmd = 'nmcli connection'

let timeout;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    /**
     * 
     * @param {string} target Name of the target VPN connection
     */
    _init(target) {
        super._init(0.0, _('My Shiny Indicator'));

        this.connected = false;
        this.target = target;

        this.add_child(disconnected_icon);

        let item = new PopupMenu.PopupMenuItem(_('Connect to vipiN'));
        item.connect('activate', () => {
            this._toggle_connect(target);
        });

        this.menu.addMenuItem(item);
    }

    /**
     * Set the connection of the given target to up if down or to down if up
     * @param {string} target name of the target connection to toggle
     */
    _toggle_connect(target){
        let cmd = base_cmd + " " + (this.connected?'down':'up') + " " + this.target;
        console.log(cmd);
        var [ok, out, err, _] = GLib.spawn_command_line_sync(cmd);

        // Check if the cmd worked
        if(out.length == 0 && err.length > 0){
            // Didn't work so report the error we got and do nothing else
            Indicator.report_error("Couldn't toggle VPN connection", err.toString());
        } else {
            this._update_state(!this.connected);
        }
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
     * Update the connection state to be the one given. This takes care of updating everything needed in the object (for instace the icon)
     * @param {boolean} new_state new state connetion state (true = connected, false = disconnected)
     * @returns {boolean} true if the state was update and false if the given state is already the current one
     */
    _update_state(new_state){
        if(this.connected == new_state){
            return false;
        }
        this.connected = new_state;
        this._update_icon();
        return true;
    }

    /**
     * Modify icon to match the current state of the connection
     */
    _update_icon(){
        this.remove_all_children();
        if(this.connected){
            this.add_child(disconnected_icon);
        } else {
            this.add_child(connected_icon);
        }
    }

    _parse_state(state_str){
        lines = state_str.split("\n");
        lines.forEach((line) => {
            tokens = line.split("\t");
            if(tokens[0] == this.target){
                return true;
            }
        });
        // If the loop didn't return then the connection wasn't active and thus return false
        return false;
    }

    check_state(){
        var [ok, out, err, _] = GLib.spawn_command_line_sync('nmcli connection show --active');
        if(ok && err.length == 0){
            let state = this._parse_state(out.toString());
            if(this._update_state(state)){
                Indicator.report_info("Connection state updated", "The state of the connection ${target} changed unexpectedly to ${state}");
            }
        } else {
            Indicator.report_error("Couldn't verify connection state", err.toString());
        }
        return true;
    }
});


class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);

    }

    enable() {
        this._indicator = new Indicator('vipiN');
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        timeout = Mainloop.timeout_add_seconds(5.0, this._indicator.check_state);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        Mainloop.source_remove(timeout);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

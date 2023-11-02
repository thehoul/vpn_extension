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
            this.toggle_connect(target);
        });

        this.menu.addMenuItem(item);
    }

    /**
     * Set the connection of the given target to up if down or to down if up
     * @param {string} target name of the target connection to toggle
     */
    toggle_connect(target){
        let cmd = base_cmd + " " + (this.connected?'down':'up') + " " + this.target;
        console.log(cmd);
        var [ok, out, err, _] = GLib.spawn_command_line_sync(cmd);
        console.log(ok, out.toString(), err.toString());
        console.log("Connected:", this.connected);

        // Check if the cmd worked
        if(out.length == 0 && err.length > 0){
            // Didn't work so report the error we got and do nothing else
            this.report_error(err.toString());
        } else {
            this.connected = !this.connected;
            this.update_icon();
        }
    }

    /**
     * Show an error notification containing the given error text.
     * @param {string} err_str Error string representation
     */    
    report_error(err_str){
        let title = this.connected?"Couldn't disconnect from the VPN":"Couldn't connect to the VPN";
        Main.notifyError(title, err_str);
    }

    /**
     * Modify icon to match the current state of the connection
     */
    update_icon(){
        this.remove_all_children();
        if(this.connected){
            this.add_child(disconnected_icon);
        } else {
            this.add_child(connected_icon);
        }
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
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

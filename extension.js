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
const target = 'vipiN'


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {


    _init() {
        super._init(0.0, _('My Shiny Indicator'));

        this.connected = false;

        this.add_child(disconnected_icon);

        let item = new PopupMenu.PopupMenuItem(_('Connect to vipiN'));
        item.connect('activate', () => {
            this.toggle_connect(target);
        });

        this.menu.addMenuItem(item);
    }

    toggle_connect(target){
        let cmd = base_cmd + " " + (this.connected?'down':'up') + " " + target
        var [ok, out, err, _] = GLib.spawn_command_line_sync(cmd);
        console.log(ok, out.toString(), err.toString());
        console.log("Connected:", this.connected);

        if(out.length == 0 && err.length > 0){
            this.report_error(err.toString());
        } else {
            this.toggle_connect();
            this.connected = !this.connected;
        }
    }

    report_error(err_str){
        Main.notifyError("Couldn't establish VPN connection", err_str);
    }

    toggle_icon(){
        if(this.connected){
            this.remove_child(connected_icon);
            this.add_child(disconnected_icon);
        } else {
            this.remove_child(disconnected_icon);
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
        this._indicator = new Indicator();
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

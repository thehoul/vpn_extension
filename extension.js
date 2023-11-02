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

const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const connected_icon = new St.Icon({
    icon_name: 'vpn_connected',
    style_class: 'system-status-icon',
});

const disconnected_icon = new St.Icon({
    icon_name: 'vpn_disconnected',
    style_class: 'system-status-icon',
});

let connected = false;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, _('My Shiny Indicator'));

        this.add_child(disconnected_icon);

        let item = new PopupMenu.PopupMenuItem(_('Connect to vipiN'));
        item.connect('activate', () => {
            if (connected){
                var [ok, out, err, exit] = GLib.spawn_command_line_sync('nmcli connection down vipiN');
                if (ok) {
                    this.remove_child(connected_icon);
                    this.add_child(disconnected_icon);
                    connected = false;
                    item.set_text("Disconnect from vipiN")
                }
            } else {
                var [ok, out, err, exit] = GLib.spawn_command_line_sync('nmcli connection up vipiN');
                if (ok) {
                    this.remove_child(disconnected_icon);
                    this.add_child(connected_icon);
                    connected = true;
                    item.set_text("Connect to vipiN")
                }
            }
        });
        this.menu.addMenuItem(item);
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

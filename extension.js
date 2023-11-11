const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;

const CONNECTED_ICON    = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_connected.svg');
const DISCONNECTED_ICON = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_disconnected.svg');
const UNKNOWN_ICON = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_unknown.svg');

const decoder = new TextDecoder();

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(targetName) {
        super._init(0.0, 'Toggle Button');
        this._target = new Target(targetName);
        this._icon = new StatusIcon(this._target.status);
        this.add_child(this._icon);
        this.connect('event', this._onClicked.bind(this));
    }

    _onClicked(actor, event) {
        if ((event.type() !== Clutter.EventType.TOUCH_BEGIN && event.type() !== Clutter.EventType.BUTTON_PRESS)) {
            // Some other non-clicky event happened; bail
            return Clutter.EVENT_PROPAGATE;
        }

        this._target.toggle_connection();
        this._icon.set_status(this._target.status);

        return Clutter.EVENT_PROPAGATE;
    }

    _check_status(){
        this._target.check_status();
        console.log(`Target status ${this._target.status}`)
        this._icon.set_status(this._target.status);
        return true; // Keep the timeout going
    }
});
 
const Status = {
    CONNECTED: 'CONNECTED',
    DISCONNECTED: 'DISCONNECTED',
    UNKNOWN: 'UNKNOWN'
}

class Target {
    constructor(name){
        this.name = name;
        this.status = this._parse_state();
    }

    toggle_connection(){
        if(this.status == Status.DISCONNECTED || this.status == Status.UNKNOWN){
            let cmd = `nmcli connection up ${this.name}`;
            let [ok, _] = invoke_cmd(cmd);
            if(ok){
                Main.notify('Success',`Connection to ${this.status} has been turned on!`);
                this.status = Status.CONNECTED;
            } else {
                Main.notify('Error',`Connection failed!`);
                // don't change the status
            }
        } else {
            let cmd = `nmcli connection down ${this.name}`;
            let [ok, _] = invoke_cmd(cmd);
            if(ok){
                Main.notify('Success',`Connection to ${this.name} has been turned off!`);
                this.status = Status.DISCONNECTED;
            } else {
                Main.notify('Error',`Connection failed!`);
                // don't change the status
            }
        }
    }

    _parse_state(){
        console.log(`Checking state of ${this.name}`)
        let [ok, out] = invoke_cmd(`nmcli -g GENERAL.STATE c s ${this.name}`);
        if(ok){
            if(out.length==0){
                return Status.DISCONNECTED;
            } else if(out.includes("activated")){
                return Status.CONNECTED;
            } else {
                console.log(`Unknown connection state: ${out}`);
                return Status.UNKNOWN;
            }
        } else {
            console.log('error running state cmd');
            return Status.UNKNOWN;
        }
    }

    check_status(){
        let status = this._parse_state();
        if(status != this.status){
            this.status = status;
            Main.notify("Connection state updated", `The state of the connection ${this.target} changed unexpectedly to ${status}`);
        }
        console.log(`Connection state is ${status}`)
        return true; // Keep the timeout going
    }
}

const StatusIcon = GObject.registerClass(
class StatusIcon extends St.Icon{
    _init(status){
        super._init({
            gicon: this._get_gicon(status),
            style_class: 'system-status-icon',
        });
    }

    _get_gicon(status){
        if(status == Status.CONNECTED){
            return CONNECTED_ICON;
        } else if(status == Status.DISCONNECTED){
            return DISCONNECTED_ICON;
        } else {
            return UNKNOWN_ICON;
        }
    }

    set_status(status){
        this._set_icon(status);
    }

    _set_icon(to_state){
        super.set_gicon(this._get_gicon(to_state));
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator('vipiN');
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        this._timeout = Mainloop.timeout_add_seconds(10.0, () => this._indicator._check_status());
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        Mainloop.source_remove(this._timeout);
    }
}


function invoke_cmd(cmd){
    var [ok, out, err, _] = GLib.spawn_command_line_sync(cmd);

    // Check if the cmd worked
    if(out.length == 0 && err.length > 0 || !ok){
        // Didn't work so report the error we got and 
        console.log("Error running method ", decoder.decode(err));
        return [false, decoder.decode(err)];
    } else {
        return [true, decoder.decode(out)];
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
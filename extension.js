const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;

const CONNECTED_ICON    = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_connected.svg');
const DISCONNECTED_ICON = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_disconnected.svg');

const decoder = new TextDecoder();

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init (target) {
        super._init(0.0, 'Toggle Button');
    
        this.target = target;
        this.connected = this._parse_state();

        this._icon = new StatusIcon(this.connected);

        this.add_child(this._icon);

        this.connect('event', this._onClicked.bind(this));
    }

    _onClicked(actor, event) {
        if ((event.type() !== Clutter.EventType.TOUCH_BEGIN && event.type() !== Clutter.EventType.BUTTON_PRESS)) {
            // Some other non-clicky event happened; bail
            return Clutter.EVENT_PROPAGATE;
        }

        // Run the command to toggle the connection to the invert of the current one
        let cmd = `nmcli connection ${!this.connected?"up":"down"} ${this.target}`;
        let [ok, _] = invoke_cmd(cmd);
        // Check that the command worked, if not stop the event
        if(!ok){
            return Clutter.EVENT_STOP;
        }

        this._set_state(!this.connected);
        
        return Clutter.EVENT_PROPAGATE;
    }

    _set_state(state){
        if(state != this.connected){
            this.connected = state;
            this._icon.set_status(this.connected);
            Main.notify('Success',`Connection has been toggled to ${this.connected?"connected":"disconnected"}!`);
        }
    }

    _invoke_cmd(cmd){
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

    _parse_state(){
        let [ok, out] = invoke_cmd(`nmcli -g GENERAL.STATE c s ${this.target}`);
        if(ok){
            if(out.length==0){
                return false;
            } else if(out.includes("activated")){
                return true;
            } else {
                console.log(`Unknown connection state: ${out}`);
                return false;
            }
        } else {
            console.log('error running state cmd');
            return false;
        }
    }

    _check_status(){
        let status = this._parse_state();
        if(status != this.connected){
            Main.notify("Connection state updated", `The state of the connection ${this.target} changed unexpectedly to ${status}`);
            this._set_state(status);
        }
        return true;
    }
});

const StatusIcon = GObject.registerClass(
class StatusIcon extends St.Icon{
    _init(status){
        super._init({
            gicon: status?CONNECTED_ICON:DISCONNECTED_ICON,
            style_class: 'system-status-icon',
        });
        this.status = status;
    }

    set_status(newStatus){
        if(newStatus != this.status){
            this.status = newStatus;
            this._set_icon(this.status);
        }
    }

    toggle_icon(){
        this.set_status(!this.status);
    }

    _set_icon(to_state){
        super.set_gicon(to_state?CONNECTED_ICON:DISCONNECTED_ICON);
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
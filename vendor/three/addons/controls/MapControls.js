/** @license MIT — Three.js Authors */
import { MOUSE, TOUCH, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from './OrbitControls.js';
const _plane = new Plane();
const _raycaster = new Raycaster();
const _mouse = new Vector2();
const _panCurrent = new Vector3();
class MapControls extends OrbitControls {
	constructor( object, domElement ) {
		super( object, domElement );
		this.screenSpacePanning = false;
		this.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
		this.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
		this._panWorldStart = new Vector3();
	}
	_handleMouseDownPan( event ) {
		super._handleMouseDownPan( event );
		this._panOffset.set( 0, 0, 0 );
		if ( this.screenSpacePanning === true ) return;
		_plane.setFromNormalAndCoplanarPoint( this.object.up, this.target );
		const element = this.domElement;
		const rect = element.getBoundingClientRect();
		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;
		_raycaster.setFromCamera( _mouse, this.object );
		_raycaster.ray.intersectPlane( _plane, this._panWorldStart );
	}
	_handleMouseMovePan( event ) {
		if ( this.screenSpacePanning === true ) {
			super._handleMouseMovePan( event );
			return;
		}
		const element = this.domElement;
		const rect = element.getBoundingClientRect();
		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;
		_raycaster.setFromCamera( _mouse, this.object );
		if ( _raycaster.ray.intersectPlane( _plane, _panCurrent ) ) {
			_panCurrent.sub( this._panWorldStart );
			this._panOffset.copy( _panCurrent ).negate();
			this.update();
		}
	}
}
export { MapControls };

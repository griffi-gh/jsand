export class Particle {
	constructor() {}
	update() {}
	static get name() { return 'NULL'; }
	static get fColor() { return [255,0,0]; }
	static get uColor() { return [255,0,0]; }
}

export const particleTypes = {};

particleTypes.air = class AirParticle extends Particle {
	static get name() { return 'AIR'; }
	static get fColor() { return [0,0,0]; }
	static get uColor() { return [255,255,255]; }
}

particleTypes.wall = class WallParticle extends Particle {
	static get name() { return 'WALL'; }
	static get fColor() { return [100,100,100]; }
	static get uColor() { return [100,100,100]; }
}

particleTypes.sand = class SandParticle extends Particle {
	update() {
		const below = this.cell.field.get(this.cell.positionX, this.cell.positionY + 1);
		if(below && below.isAir) {
			this.cell.nextState = 'clear';
			below.nextState = this;
		} else {
			const left = this.cell.field.get(this.cell.positionX - 1, this.cell.positionY + 1);
			if(left && left.isAir) {
				this.cell.nextState = 'clear';
				left.nextState = this;
			} else {
				const right = this.cell.field.get(this.cell.positionX + 1, this.cell.positionY + 1);
				if(right && right.isAir) {
					this.cell.nextState = 'clear';
					right.nextState = this;
				}
			}
		}
	}
	static get name() { return 'SAND'; }
	static get fColor() { return [200,200,100]; }
	static get uColor() { return [200,200,100]; }
}
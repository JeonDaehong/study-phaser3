import Phaser from "phaser";

export default class Mob extends Phaser.Physics.Arcade.Sprite {
    /**
     * scene의 (x, y) 위치에 texture 이미지 및 animKey 애니메이션을 실행하며
     * initHp의 HP, dropRate의 아이템 드랍율을 가진 Mob object를 추가합니다.
     * @param {Phaser.scene} scene
     * @param {Number} x
     * @param {Number} y
     * @param {String} texture
     * @param {String} animKey
     * @param {Number} initHp
     * @param {Number} dropRate
     */
    constructor(scene, x, y, texture, animKey, initHp, dropRate) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.play(animKey);
        this.setDepth(10);
        this.scale = 2;
        // speed, hp, dropRate 멤버 변수를 추가해줍니다.
        // speed를 몹마다 다르게 조절할 수도 있습니다.
        this.m_speed = 50;
        this.m_hp = initHp;
        this.m_dropRate = dropRate;

        // 각 몹마다 사이즈에 맞게 body size, offset을 설정해주었습니다.
        // https://newdocs.phaser.io/docs/3.60.0-beta.20 에서 setbodysize 검색
        if (texture === "mob1") {
            // mob 1만 바닥을 기준으로 움직이고 있습니다. 움직일 때 중심을 기준으로 움직이지 않고 오프셋을 설정한 곳에 기준으로 움직이게 해두었습니다. 아주 미묘한 차이입니다. 
            this.setBodySize(24, 14, false);
            this.setOffset(0, 14);
        } else if (texture === "mob2") {
            this.setBodySize(24, 32);
        } else if (texture === "mob3") {
            this.setBodySize(24, 32);
        } else if (texture === "mob4") {
            this.setBodySize(24, 32);
        } else if (texture === "lion") {
            this.setBodySize(40, 64);
        }

        // Mob이 계속해서(0.1초마다) player 방향으로 움직이도록 해줍니다.
        this.m_events = [];
        this.m_events.push(
            this.scene.time.addEvent({
                delay: 100,
                callback: () => {
                scene.physics.moveToObject(this, scene.m_player, this.m_speed);
                },
                loop: true,
            })
        );

        // Phaser.Scene에는 update 함수가 있지만
        // Mob은 Phaser.Physics.Arcade.Sprite를 상속한 클래스로 update 함수가 없기 때문에
        // Scene의 update가 실행될 때마다 mob도 update 함수가 실행되게 구현해준 부분입니다.
        // https://newdocs.phaser.io/docs/3.60.0-beta.20/Phaser.Scenes.Events.UPDATE
        scene.events.on("update", (time, delta) => {
        this.update(time, delta); // 현재 시간, FPS(Frame per Sec, 1초당 보여주는 프레임 수) 평활화(급격한 변화를 제외) 값
        });
    }

    update() {
        // mob이 없을 경우의 예외처리입니다.
        if (!this.body) return;

        // 오른쪽으로 향할 때는 오른쪽을, 왼쪽으로 향할 때는 왼쪽을 바라보도록 해줍니다.
        if (this.x < this.scene.m_player.x) this.flipX = true;
        else this.flipX = false;
    }
}
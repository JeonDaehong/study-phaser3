import Phaser from "phaser";
import Player from "../characters/Player";
import Mob from "../characters/Mob";
import Config from "../Config";
import { setBackground } from "../utils/backgroundManager";
import { addMobEvent, removeOldestMobEvent } from "../utils/mobManager";
import TopBar from '../ui/TopBar';
import ExpBar from '../ui/ExpBar';
import { pause } from "../utils/pauseManager";
import { setAttackScale, setAttackDamage, addAttackEvent } from "../utils/attackManager"
import { createTime } from "../utils/time";

export default class PlayingScene extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    create() {
        // 사용할 sound들을 추가해놓는 부분입니다.
        // load는 전역적으로 어떤 scene에서든 asset을 사용할 수 있도록 load 해주는 것이고,
        // add는 해당 scene에서 사용할 수 있도록 scene의 멤버 변수로 추가할 때 사용하는 것입니다.
        this.sound.pauseOnBlur = false;
        this.m_beamSound = this.sound.add("audio_beam");
        this.m_scratchSound = this.sound.add("audio_scratch");
        this.m_hitMobSound = this.sound.add("audio_hitMob");
        this.m_growlSound = this.sound.add("audio_growl");
        this.m_explosionSound = this.sound.add("audio_explosion");
        this.m_expUpSound = this.sound.add("audio_expUp");
        this.m_hurtSound = this.sound.add("audio_hurt");
        this.m_nextLevelSound = this.sound.add("audio_nextLevel");
        this.m_gameOverSound = this.sound.add("audio_gameOver");
        this.m_gameClearSound = this.sound.add("audio_gameClear");
        this.m_pauseInSound = this.sound.add("audio_pauseIn");
        this.m_pauseOutSound = this.sound.add("audio_pauseOut");
        // exp up item들을 담을 physics group을 추가해줍니다.
        this.m_expUps = this.physics.add.group();


        // player를 m_player라는 멤버 변수로 추가합니다.
        this.m_player = new Player(this);

        // PlayingScene의 background를 설정합니다.
        setBackground(this, "background1");

        // 키보드 키를 m_cursorKeys라는 멤버 변수로 추가해줍니다.
		this.m_cursorKeys = this.input.keyboard.createCursorKeys();

        // camera가 player를 따라오도록 하여 뱀파이어 서바이벌처럼 player가 가운데 고정되도록 합니다.
        this.cameras.main.startFollow(this.m_player);

        // Attacks
        // 정적인 공격과 동적인 공격의 동작 방식이 다르므로 따로 group을 만들어줍니다.
        // attack event를 저장하는 객체도 멤버 변수로 만들어줍니다.
        // 이는 공격 강화등에 활용될 것입니다.
        this.m_weaponDynamic = this.add.group();
        this.m_weaponStatic = this.add.group();
        this.m_attackEvents = {};

        // 맨 처음 추가될 공격은 create 메소드 내에서 추가해줍니다.
        addAttackEvent(this, "claw", 10, 2, 1500);
        addAttackEvent(this, "beam", 10, 1, 1000);


        // Mobs
        // m_mobs는 physics group으로, 속한 모든 오브젝트에 동일한 물리법칙을 적옹할 수 있습니다.
        // m_mobEvents는 mob event의 timer를 담을 배열로, mob event를 추가 및 제거할 때 사용할 것입니다.
        // addMobEvent는 m_mobEvents에 mob event의 timer를 추가해줍니다.
        this.m_mobs = this.physics.add.group();
        // 맨 처음에 등장하는 몹을 수동으로 추가해줍니다.
        // 추가하지 않으면 closest mob을 찾는 부분에서 에러가 발생합니다.
        this.m_mobs.add(new Mob(this, 0, 0, "mob1", "mob1_anim", 10));
        this.m_mobEvents = [];
        addMobEvent(this, 500, "mob1", "mob1_anim", 10, 0.8);

        // Collisions
        // Player와 mob이 부딪혔을 경우 player에 데미지 10을 줍니다.
        // (Player.js에서 hitByMob 함수 확인)
        this.physics.add.overlap(
            this.m_player,
            this.m_mobs,
            () => this.m_player.hitByMob(10),
            null,
            this
        );
        
        // mob이 dynamic 공격에 부딪혓을 경우 mob에 해당 공격의 데미지만큼 데미지를 줍니다.
        // (Mob.js에서 hitByDynamic 함수 확인)
        this.physics.add.overlap(
            this.m_weaponDynamic,
            this.m_mobs,
            (weapon, mob) => {
            mob.hitByDynamic(weapon, weapon.m_damage);
            },
            null,
            this
        );
        
        // mob이 static 공격에 부딪혓을 경우 mob에 해당 공격의 데미지만큼 데미지를 줍니다.
        // (Mob.js에서 hitByStatic 함수 확인)
        this.physics.add.overlap(
            this.m_weaponStatic,
            this.m_mobs,
            (weapon, mob) => {
            mob.hitByStatic(weapon.m_damage);
            },
            null,
            this
        );

        // player와 expUp이 접촉했을 때 pickExpUp 메소드가 동작하도록 합니다.
        this.physics.add.overlap(
            this.m_player,
            this.m_expUps,
            this.pickExpUp,
            null,
            this
        );

      // topBar, expBar를 PlayingScene에 추가해줍니다. 
	  // 맨 처음 maxExp는 50으로 설정해줍니다.
	  this.m_topBar = new TopBar(this);
	  this.m_expBar = new ExpBar(this, 50);

      // event handler
      // ESC 키를 누르면 "pause" 유형으로 일시정지 시킵니다.
      this.input.keyboard.on(
        "keydown-ESC",
        () => { pause(this, "pause"); },
        this
      );

      // time
      // 플레이 시간을 생성해줍니다.
      createTime(this);

    }

    update() {
        this.movePlayerManager();

        // camera가 가는 곳으로 background가 따라 움직이도록 해줍니다.
        this.m_background.setX(this.m_player.x - Config.width / 2);
        this.m_background.setY(this.m_player.y - Config.height / 2);

        // tilePosition을 player가 움직이는 만큼 이동시켜 마치 무한 배경인 것처럼 나타내 줍니다.
        this.m_background.tilePositionX = this.m_player.x - Config.width / 2;
        this.m_background.tilePositionY = this.m_player.y - Config.height / 2;

        // player로부터 가장 가까운 mob을 구합니다.
        // 가장 가까운 mob은 mob, player의 움직임에 따라 계속 바뀌므로 update 내에서 구해야 합니다.
        // getChildren: group에 속한 모든 객체들의 배열을 리턴하는 메소드입니다.
        const closest = this.physics.closest(
            this.m_player,
            this.m_mobs.getChildren()
        );
        this.m_closest = closest;
    }

    // player와 expUp이 접촉했을 때 실행되는 메소드입니다.
    pickExpUp(player, expUp) {
        expUp.disableBody(true, true);
        expUp.destroy();
      
        this.m_expUpSound.play();
        // expUp item을 먹으면 expBar의 경험치를 아이템의 m_exp 값만큼 증가시켜줍니다.
        this.m_expBar.increase(expUp.m_exp);
          // 만약 현재 경험치가 maxExp 이상이면 레벨을 증가시켜줍니다.
        if (this.m_expBar.m_currentExp >= this.m_expBar.m_maxExp) {
          this.m_topBar.gainLevel();
        }
      }

    // player가 움직이도록 해주는 메소드입니다.
    movePlayerManager() {
        // 이동 키가 눌려있으면 player가 걸어다니는 애니메이션을 재생하고,
        // 이동 키가 눌려있지 않으면 player가 가만히 있도록 합니다.
        if (this.m_cursorKeys.left.isDown || this.m_cursorKeys.right.isDown || this.m_cursorKeys.up.isDown || this.m_cursorKeys.down.isDown) {
            if (!this.m_player.m_moving) {
                this.m_player.play("player_anim");
            }
            this.m_player.m_moving = true;
        } else {
            if (this.m_player.m_moving) {
                this.m_player.play("player_idle");
            }
            this.m_player.m_moving = false;
        }

        // vector를 사용해 움직임을 관리할 것입니다.
        // vector = [x좌표 방향, y좌표 방향]입니다.
        // 왼쪽 키가 눌려있을 때는 vector[0] += -1, 오른쪽 키가 눌려있을 때는 vector[0] += 1을 해줍니다.
        // 위/아래 또한 같은 방법으로 벡터를 수정해줍니다.
        let vector = [0, 0];
        if (this.m_cursorKeys.left.isDown) {
            // player.x -= PLAYER_SPEED; // 공개영상에서 진행했던 것
            vector[0] += -1;
        } else if (this.m_cursorKeys.right.isDown) {
            vector[0] += 1;
        }
        if (this.m_cursorKeys.up.isDown) {
            vector[1] += -1;
        } else if (this.m_cursorKeys.down.isDown) {
            vector[1] += 1;
        }

        // vector를 player 클래스의 메소드의 파라미터로 넘겨줍니다.
        this.m_player.move(vector);

        // static 공격들은 player가 이동하면 그대로 따라오도록 해줍니다.
        this.m_weaponStatic.children.each(weapon => { weapon.move(vector); }, this);
    }

    pickExpUp(player, expUp) {
        expUp.disableBody(true, true);
        expUp.destroy();
    
        this.m_expUpSound.play();
        this.m_expUpSound.setVolume(0.3);
        this.m_expBar.increase(expUp.m_exp);
        if (this.m_expBar.m_currentExp >= this.m_expBar.m_maxExp) {
          // maxExp를 초과하면 레벨업을 해주던 기존의 코드를 지우고
          // afterLevelUp 메소드를 만들어 거기에 옮겨줍니다.
          // 추후 레벨에 따른 몹, 무기 추가를 afterLevelUp에서 실행해 줄 것입니다.
          pause(this, "levelup");
        }
      }
    
      afterLevelUp() {
        this.m_topBar.gainLevel();
      
        // 레벨이 2, 3, 4, ..가 되면 등장하는 몹을 변경해줍니다.
        // 이전 몹 이벤트를 지우지 않으면 난이도가 너무 어려워지기 때문에 이전 몹 이벤트를 지워줍니다.
        // 레벨이 높아질 수록 강하고 아이텝 드랍율이 낮은 몹을 등장시킵니다.
        // repeatGap은 동일하게 설정했지만 레벨이 올라갈수록 더 짧아지도록 조절하셔도 됩니다.
        switch (this.m_topBar.m_level) {
            case 2:
                removeOldestMobEvent(this);
                addMobEvent(this, 1000, "mob1", "mob1_anim", 10, 0.8);
                addMobEvent(this, 1000, "mob2", "mob2_anim", 20, 0.5);
                // claw 공격 크기 확대
                setAttackScale(this, "claw", 4);
                break;
            case 3:
                removeOldestMobEvent(this);
                addMobEvent(this, 1000, "mob1", "mob1_anim", 10, 0.8);
                addMobEvent(this, 1000, "mob2", "mob2_anim", 20, 0.5);
                addMobEvent(this, 1000, "mob3", "mob3_anim", 30, 0.7);
                // catnip 공격 추가
                addAttackEvent(this, "catnip", 10, 2);
                break;
            case 4:
                removeOldestMobEvent(this);
                addMobEvent(this, 1000, "mob1", "mob1_anim", 10, 0.8);
                addMobEvent(this, 1000, "mob2", "mob2_anim", 20, 0.5);
                addMobEvent(this, 1000, "mob3", "mob3_anim", 30, 0.7);
                addMobEvent(this, 1000, "mob4", "mob4_anim", 40, 0.9);
                // catnip 공격 크기 확대
                setAttackScale(this, "catnip", 3);
                break;
            case 5:
                setAttackScale(this, "beam", 1.5);
                setAttackDamage(this, "beam", 40);
                break;
            case 6:
                setAttackScale(this, "beam", 2);
                setAttackDamage(this, "beam", 70);
                break;
            case 7:
                setAttackScale(this, "claw", 7);
                break;
        }
    }
}
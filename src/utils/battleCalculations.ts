// utils/battleCalculations.ts

import {
  Character,
  CharacterStats,
  CharacterClass,
  Enemy,
  AttackType,
  BattleLogEntry,
  BattleChoice,
  BattleRewardConfig,
  BattleRewards,
} from "../types/vygddrasil.types";

/**
 * 캐릭터의 총 스텟 계산 (기본 + NFT 보너스)
 */
export function getTotalStats(character: Character): CharacterStats {
  return {
    str: character.str + (character.bonus_str || 0),
    agi: character.agi + (character.bonus_agi || 0),
    int: character.int + (character.bonus_int || 0),
    hp: character.hp + (character.bonus_hp || 0),
    mp: character.mp + (character.bonus_mp || 0),
    luck: character.luck + (character.bonus_luck || 0),
  };
}

/**
 * 클래스별 기본 공격 타입 반환
 */
export function getClassAttackType(characterClass: string): AttackType {
  const magicalClasses: CharacterClass[] = ["magician", "bard"];
  const physicalClasses: CharacterClass[] = ["warrior", "assassin", "archer"];

  if (magicalClasses.includes(characterClass as CharacterClass)) {
    return "magical";
  }
  if (physicalClasses.includes(characterClass as CharacterClass)) {
    return "physical";
  }
  return "physical";
}

/**
 * 데미지 계산
 * @returns { damage: number, isCritical: boolean }
 */
export function calculateDamage(
  attacker: CharacterStats,
  defender: CharacterStats,
  attackType: AttackType,
  skillMultiplier: number = 1.0,
  isDefending: boolean = false
): { damage: number; isCritical: boolean } {
  // 기본 공격력 계산
  let baseAttack: number;
  if (attackType === "physical") {
    baseAttack = attacker.str * 2;
  } else if (attackType === "magical") {
    baseAttack = attacker.int * 2;
  } else {
    // mixed: 물리와 마법 중 높은 쪽
    baseAttack = Math.max(attacker.str * 2, attacker.int * 2);
  }

  // 방어력 계산
  let defense: number;
  if (attackType === "physical") {
    defense = defender.str * 0.5 + defender.agi * 0.3;
  } else if (attackType === "magical") {
    defense = defender.int * 0.5 + defender.mp * 0.01;
  } else {
    defense = (defender.str * 0.5 + defender.int * 0.5) / 2;
  }

  // 방어 자세 시 방어력 2배
  if (isDefending) {
    defense *= 2;
  }

  // 크리티컬 확률 (luck 기반, 최대 50%)
  const critChance = Math.min(attacker.luck * 2, 50) / 100;
  const isCritical = Math.random() < critChance;
  const critMultiplier = isCritical ? 1.5 : 1.0;

  // 최종 데미지 계산
  let damage = (baseAttack - defense * 0.3) * skillMultiplier * critMultiplier;

  // +/- 10% 변동
  const variance = damage * 0.1;
  damage += Math.random() * variance * 2 - variance;

  // 최소 1 데미지 보장
  return {
    damage: Math.max(1, Math.floor(damage)),
    isCritical,
  };
}

/**
 * 회피 계산
 * @returns true if attack is dodged
 */
export function calculateDodge(
  attacker: CharacterStats,
  defender: CharacterStats
): boolean {
  // 회피 확률 (최대 60%)
  const baseDodgeChance = Math.min(defender.agi * 1.5 + defender.luck * 0.5, 60) / 100;

  // 공격자 명중 보정
  const hitModifier = (attacker.agi * 0.5) / 100;

  // 최종 회피 확률
  const finalDodgeChance = Math.max(0, baseDodgeChance - hitModifier);

  return Math.random() < finalDodgeChance;
}

/**
 * 도주 성공 확률 계산
 */
export function calculateFleeChance(
  player: CharacterStats,
  enemy: CharacterStats
): boolean {
  // 도주 확률: 플레이어 AGI 기반, 적 AGI가 높으면 감소
  const baseFleeChance = 0.3 + (player.agi - enemy.agi) * 0.02 + player.luck * 0.01;
  const finalFleeChance = Math.max(0.1, Math.min(0.9, baseFleeChance));

  return Math.random() < finalFleeChance;
}

/**
 * 자동 전투 시뮬레이션
 */
export function calculateAutoBattle(
  character: Character,
  enemy: Enemy
): {
  result: "victory" | "defeat";
  turns: number;
  log: BattleLogEntry[];
} {
  const playerStats = getTotalStats(character);
  const playerAttackType = getClassAttackType(character.class);

  const log: BattleLogEntry[] = [];
  let playerHp = playerStats.hp;
  let enemyHp = enemy.hp;
  let turn = 0;
  const maxTurns = 50;

  while (playerHp > 0 && enemyHp > 0 && turn < maxTurns) {
    turn++;
    const timestamp = new Date().toISOString();

    // 플레이어 턴
    const playerDodged = calculateDodge(playerStats, enemy);
    if (!playerDodged) {
      const { damage, isCritical } = calculateDamage(
        playerStats,
        enemy,
        playerAttackType
      );
      enemyHp -= damage;
      log.push({
        turn,
        actor: "player",
        action: isCritical ? "크리티컬 공격!" : "공격",
        damage,
        isCritical,
        timestamp,
      });
    } else {
      log.push({
        turn,
        actor: "player",
        action: "공격 (회피됨)",
        isDodged: true,
        timestamp,
      });
    }

    if (enemyHp <= 0) break;

    // 적 턴
    const enemyDodged = calculateDodge(enemy, playerStats);
    if (!enemyDodged) {
      const { damage, isCritical } = calculateDamage(
        enemy,
        playerStats,
        enemy.attack_type
      );
      playerHp -= damage;
      log.push({
        turn,
        actor: "enemy",
        action: isCritical ? "크리티컬 공격!" : "공격",
        damage,
        isCritical,
        timestamp,
      });
    } else {
      log.push({
        turn,
        actor: "enemy",
        action: "공격 (회피됨)",
        isDodged: true,
        timestamp,
      });
    }
  }

  return {
    result: playerHp > 0 ? "victory" : "defeat",
    turns: turn,
    log,
  };
}

/**
 * 선택지 전투 한 라운드 결과 계산 (HP 기반 멀티 라운드용)
 */
export function calculateChoiceRound(
  character: Character,
  enemy: Enemy,
  choice: BattleChoice,
  currentPlayerHp: number,
  currentEnemyHp: number
): {
  success: boolean;
  playerDamage: number;
  enemyDamage: number;
  newPlayerHp: number;
  newEnemyHp: number;
  description: string;
  isCritical: boolean;
} {
  const playerStats = getTotalStats(character);
  const attackType = getClassAttackType(character.class);

  // 스탯 체크로 성공 여부 결정
  let successChance = 0.5;

  if (choice.stat_check_stat && choice.stat_check_threshold) {
    const playerStatValue = playerStats[choice.stat_check_stat];
    const threshold = choice.stat_check_threshold;
    successChance = 0.5 + (playerStatValue - threshold) * 0.05;
  }

  // luck 보너스
  successChance += playerStats.luck * 0.01;
  successChance = Math.max(0.1, Math.min(0.9, successChance));

  const success = Math.random() < successChance;

  let playerDamage = 0;
  let enemyDamage = 0;
  let isCritical = false;

  if (success) {
    // 성공: 플레이어가 적에게 큰 데미지
    const damageResult = calculateDamage(playerStats, enemy, attackType, 1.5);
    enemyDamage = damageResult.damage;
    isCritical = damageResult.isCritical;

    // 적의 반격 (약한 데미지)
    const counterResult = calculateDamage(enemy, playerStats, enemy.attack_type, 0.5);
    playerDamage = counterResult.damage;
  } else {
    // 실패: 적이 플레이어에게 큰 데미지
    const damageResult = calculateDamage(enemy, playerStats, enemy.attack_type, 1.2);
    playerDamage = damageResult.damage;
    isCritical = damageResult.isCritical;

    // 플레이어의 미약한 공격
    const counterResult = calculateDamage(playerStats, enemy, attackType, 0.3);
    enemyDamage = counterResult.damage;
  }

  const newPlayerHp = Math.max(0, currentPlayerHp - playerDamage);
  const newEnemyHp = Math.max(0, currentEnemyHp - enemyDamage);

  return {
    success,
    playerDamage,
    enemyDamage,
    newPlayerHp,
    newEnemyHp,
    description: success ? choice.description_success : choice.description_failure,
    isCritical,
  };
}

/**
 * 선택지 전투 결과 계산 (레거시 - 한 번에 승패 결정)
 */
export function calculateChoiceBattle(
  character: Character,
  choice: BattleChoice
): {
  success: boolean;
  finalOutcome: "victory" | "defeat" | "partial_victory" | "escape";
  description: string;
} {
  // 스탯 체크가 없으면 선택 결과 그대로 따름
  if (!choice.stat_check_stat || !choice.stat_check_threshold) {
    const success = choice.outcome === "victory" || choice.outcome === "partial_victory";
    return {
      success,
      finalOutcome: choice.outcome,
      description: success ? choice.description_success : choice.description_failure,
    };
  }

  const playerStats = getTotalStats(character);
  const playerStatValue = playerStats[choice.stat_check_stat];
  const threshold = choice.stat_check_threshold;

  // 기본 성공 확률 계산
  let successChance = 0.5 + (playerStatValue - threshold) * 0.05;

  // luck 보너스
  successChance += playerStats.luck * 0.01;

  // 확률 범위 제한 (10% ~ 90%)
  successChance = Math.max(0.1, Math.min(0.9, successChance));

  const success = Math.random() < successChance;

  return {
    success,
    finalOutcome: success ? choice.outcome : "defeat",
    description: success ? choice.description_success : choice.description_failure,
  };
}

/**
 * 전투 보상 계산
 */
export function calculateBattleRewards(
  config: BattleRewardConfig,
  isVictory: boolean
): BattleRewards {
  if (!isVictory) {
    return { exp: 0, gold: 0 };
  }

  const rewards: BattleRewards = {
    exp: config.exp_reward,
    gold: config.gold_reward,
  };

  // 스탯 보너스
  if (config.stat_bonus_type && config.stat_bonus_value > 0) {
    let stat = config.stat_bonus_type;

    // 랜덤 스탯인 경우
    if (stat === "random") {
      const stats: ("str" | "agi" | "int" | "hp" | "mp" | "luck")[] = [
        "str",
        "agi",
        "int",
        "hp",
        "mp",
        "luck",
      ];
      stat = stats[Math.floor(Math.random() * stats.length)];
    }

    rewards.statBonus = {
      stat,
      value: config.stat_bonus_value,
    };
  }

  // NFT 보상
  if (config.nft_reward_enabled) {
    rewards.nftReward = true;
    rewards.nftContractAddress = config.nft_contract_address;
    rewards.nftTokenId = config.nft_token_id;
  }

  return rewards;
}

/**
 * 레벨업 체크
 */
export function checkLevelUp(
  currentLevel: number,
  currentExp: number,
  expGained: number
): {
  newLevel: number;
  newExp: number;
  leveledUp: boolean;
  levelsGained: number;
} {
  const EXP_PER_LEVEL = 100;
  let totalExp = currentExp + expGained;
  let level = currentLevel;
  let levelsGained = 0;

  while (totalExp >= EXP_PER_LEVEL) {
    totalExp -= EXP_PER_LEVEL;
    level++;
    levelsGained++;
  }

  return {
    newLevel: level,
    newExp: totalExp,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

/**
 * 레벨업 스탯 보너스 계산
 */
export function getLevelUpStatBonus(levelsGained: number): CharacterStats {
  // 레벨당 모든 스탯 +1
  return {
    str: levelsGained,
    agi: levelsGained,
    int: levelsGained,
    hp: levelsGained * 10, // HP는 10씩
    mp: levelsGained * 5, // MP는 5씩
    luck: levelsGained,
  };
}

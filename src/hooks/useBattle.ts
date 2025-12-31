// hooks/useBattle.ts

import { useState, useCallback } from "react";
import {
  Character,
  Enemy,
  BattleState,
  BattleAction,
  BattleLogEntry,
  BattleChoice,
  BattleRewardConfig,
  BattleRewards,
  Skill,
} from "../types/vygddrasil.types";
import {
  getTotalStats,
  getClassAttackType,
  calculateDamage,
  calculateDodge,
  calculateFleeChance,
  calculateAutoBattle,
  calculateChoiceBattle,
  calculateBattleRewards,
} from "../utils/battleCalculations";

/** 초기 전투 상태 */
const initialBattleState: BattleState = {
  isActive: false,
  turn: "player",
  turnCount: 0,
  playerCurrentHp: 0,
  playerMaxHp: 0,
  playerCurrentMp: 0,
  playerMaxMp: 0,
  playerBuffs: [],
  playerDebuffs: [],
  playerDefending: false,
  enemy: null,
  enemyCurrentHp: 0,
  enemyMaxHp: 0,
  enemyBuffs: [],
  enemyDebuffs: [],
  battleLog: [],
  result: "ongoing",
  rewards: undefined,
};

export const useBattle = (character: Character | null) => {
  const [battleState, setBattleState] = useState<BattleState>(initialBattleState);

  /**
   * 전투 시작
   */
  const startBattle = useCallback(
    (enemy: Enemy) => {
      if (!character) return;

      const totalStats = getTotalStats(character);

      setBattleState({
        isActive: true,
        turn: "player",
        turnCount: 1,
        playerCurrentHp: totalStats.hp,
        playerMaxHp: totalStats.hp,
        playerCurrentMp: totalStats.mp,
        playerMaxMp: totalStats.mp,
        playerBuffs: [],
        playerDebuffs: [],
        playerDefending: false,
        enemy,
        enemyCurrentHp: enemy.hp,
        enemyMaxHp: enemy.hp,
        enemyBuffs: [],
        enemyDebuffs: [],
        battleLog: [
          {
            turn: 0,
            actor: "player",
            action: `${enemy.name}이(가) 나타났다!`,
            timestamp: new Date().toISOString(),
          },
        ],
        result: "ongoing",
        rewards: undefined,
      });
    },
    [character]
  );

  /**
   * 턴제 전투: 플레이어 행동 실행
   */
  const executePlayerAction = useCallback(
    (action: BattleAction, skill?: Skill) => {
      if (!character || !battleState.enemy || battleState.result !== "ongoing") {
        return;
      }

      const playerStats = getTotalStats(character);
      const attackType = getClassAttackType(character.class);

      setBattleState((prev) => {
        if (!prev.enemy) return prev;

        const enemy = prev.enemy;
        const logs: BattleLogEntry[] = [];
        const timestamp = new Date().toISOString();

        // prev 상태 기준으로 계산
        let newEnemyHp = prev.enemyCurrentHp;
        let newPlayerMp = prev.playerCurrentMp;
        let newPlayerHp = prev.playerCurrentHp;

        switch (action) {
          case "attack": {
            const dodged = calculateDodge(playerStats, enemy);
            if (dodged) {
              logs.push({
                turn: prev.turnCount,
                actor: "player",
                action: "공격했지만 빗나갔다!",
                isDodged: true,
                timestamp,
              });
            } else {
              const { damage, isCritical } = calculateDamage(
                playerStats,
                enemy,
                attackType
              );
              newEnemyHp = Math.max(0, newEnemyHp - damage);
              logs.push({
                turn: prev.turnCount,
                actor: "player",
                action: isCritical ? "크리티컬 공격!" : "공격!",
                damage,
                isCritical,
                timestamp,
              });
            }
            break;
          }

          case "defend": {
            logs.push({
              turn: prev.turnCount,
              actor: "player",
              action: "방어 자세를 취했다.",
              timestamp,
            });
            break;
          }

          case "skill": {
            // 기본 스킬 (스킬 객체 없이 사용)
            const defaultSkillMpCost = 10;
            const defaultSkillMultiplier = 1.5;

            if (skill) {
              if (newPlayerMp >= skill.mpCost) {
                newPlayerMp -= skill.mpCost;

                if (skill.effectType === "damage") {
                  const dodged = calculateDodge(playerStats, enemy);
                  if (dodged) {
                    logs.push({
                      turn: prev.turnCount,
                      actor: "player",
                      action: `${skill.name}을(를) 사용했지만 빗나갔다!`,
                      isDodged: true,
                      timestamp,
                    });
                  } else {
                    const { damage, isCritical } = calculateDamage(
                      playerStats,
                      enemy,
                      attackType,
                      skill.damageMultiplier
                    );
                    newEnemyHp = Math.max(0, newEnemyHp - damage);
                    logs.push({
                      turn: prev.turnCount,
                      actor: "player",
                      action: `${skill.name}!${isCritical ? " 크리티컬!" : ""}`,
                      damage,
                      isCritical,
                      timestamp,
                    });
                  }
                } else if (skill.effectType === "heal") {
                  const healAmount = Math.floor(skill.damageMultiplier * playerStats.int);
                  newPlayerHp = Math.min(prev.playerMaxHp, newPlayerHp + healAmount);
                  logs.push({
                    turn: prev.turnCount,
                    actor: "player",
                    action: `${skill.name}으로 ${healAmount} 회복!`,
                    heal: healAmount,
                    timestamp,
                  });
                }
              } else {
                logs.push({
                  turn: prev.turnCount,
                  actor: "player",
                  action: "MP가 부족하다!",
                  timestamp,
                });
              }
            } else {
              // 기본 스킬 (스킬 객체 없이 버튼 클릭)
              if (newPlayerMp >= defaultSkillMpCost) {
                newPlayerMp -= defaultSkillMpCost;
                const dodged = calculateDodge(playerStats, enemy);
                if (dodged) {
                  logs.push({
                    turn: prev.turnCount,
                    actor: "player",
                    action: "강력한 일격을 사용했지만 빗나갔다!",
                    isDodged: true,
                    timestamp,
                  });
                } else {
                  const { damage, isCritical } = calculateDamage(
                    playerStats,
                    enemy,
                    attackType,
                    defaultSkillMultiplier
                  );
                  newEnemyHp = Math.max(0, newEnemyHp - damage);
                  logs.push({
                    turn: prev.turnCount,
                    actor: "player",
                    action: `강력한 일격!${isCritical ? " 크리티컬!" : ""}`,
                    damage,
                    isCritical,
                    timestamp,
                  });
                }
              } else {
                logs.push({
                  turn: prev.turnCount,
                  actor: "player",
                  action: "MP가 부족하다!",
                  timestamp,
                });
              }
            }
            break;
          }

          case "flee": {
            const escaped = calculateFleeChance(playerStats, enemy);
            if (escaped) {
              logs.push({
                turn: prev.turnCount,
                actor: "player",
                action: "도망에 성공했다!",
                timestamp,
              });
              return {
                ...prev,
                battleLog: [...prev.battleLog, ...logs],
                result: "fled" as const,
              };
            } else {
              logs.push({
                turn: prev.turnCount,
                actor: "player",
                action: "도망치지 못했다!",
                timestamp,
              });
            }
            break;
          }
        }

        // 적 처치 확인
        if (newEnemyHp <= 0) {
          logs.push({
            turn: prev.turnCount,
            actor: "player",
            action: `${enemy.name}을(를) 쓰러뜨렸다!`,
            timestamp,
          });
          return {
            ...prev,
            enemyCurrentHp: 0,
            playerCurrentHp: newPlayerHp,
            playerCurrentMp: newPlayerMp,
            playerDefending: action === "defend",
            battleLog: [...prev.battleLog, ...logs],
            result: "victory" as const,
          };
        }

        // 턴 전환
        return {
          ...prev,
          enemyCurrentHp: newEnemyHp,
          playerCurrentHp: newPlayerHp,
          playerCurrentMp: newPlayerMp,
          playerDefending: action === "defend",
          turn: "enemy" as const,
          battleLog: [...prev.battleLog, ...logs],
        };
      });
    },
    [character, battleState.enemy, battleState.result]
  );

  /**
   * 턴제 전투: 적 행동 실행 (자동)
   */
  const executeEnemyAction = useCallback(() => {
    if (!character || !battleState.enemy || battleState.result !== "ongoing") {
      return;
    }

    const playerStats = getTotalStats(character);
    const enemy = battleState.enemy;

    setBattleState((prev) => {
      if (prev.turn !== "enemy") return prev;

      const timestamp = new Date().toISOString();
      const logs: BattleLogEntry[] = [];

      const dodged = calculateDodge(enemy, playerStats);
      let newPlayerHp = prev.playerCurrentHp;

      if (dodged) {
        logs.push({
          turn: prev.turnCount,
          actor: "enemy",
          action: `${enemy.name}의 공격을 회피했다!`,
          isDodged: true,
          timestamp,
        });
      } else {
        const { damage, isCritical } = calculateDamage(
          enemy,
          playerStats,
          enemy.attack_type,
          1.0,
          prev.playerDefending
        );
        newPlayerHp = Math.max(0, prev.playerCurrentHp - damage);
        logs.push({
          turn: prev.turnCount,
          actor: "enemy",
          action: `${enemy.name}의 공격!${isCritical ? " 크리티컬!" : ""}`,
          damage,
          isCritical,
          timestamp,
        });
      }

      // 플레이어 패배 확인
      if (newPlayerHp <= 0) {
        logs.push({
          turn: prev.turnCount,
          actor: "enemy",
          action: "당신은 쓰러졌다...",
          timestamp,
        });
        return {
          ...prev,
          playerCurrentHp: 0,
          playerDefending: false,
          battleLog: [...prev.battleLog, ...logs],
          result: "defeat" as const,
        };
      }

      // 다음 턴으로
      return {
        ...prev,
        playerCurrentHp: newPlayerHp,
        playerDefending: false,
        turn: "player" as const,
        turnCount: prev.turnCount + 1,
        battleLog: [...prev.battleLog, ...logs],
      };
    });
  }, [character, battleState.enemy, battleState.result]);

  /**
   * 자동 전투 실행
   */
  const executeAutoBattle = useCallback(
    (enemy: Enemy, rewardConfig?: BattleRewardConfig): Promise<BattleState> => {
      return new Promise((resolve) => {
        if (!character) {
          resolve(battleState);
          return;
        }

        const result = calculateAutoBattle(character, enemy);
        const totalStats = getTotalStats(character);

        const finalState: BattleState = {
          isActive: true,
          turn: "player",
          turnCount: result.turns,
          playerCurrentHp:
            result.result === "victory"
              ? Math.max(1, totalStats.hp - result.log.filter((l) => l.actor === "enemy" && l.damage).reduce((sum, l) => sum + (l.damage || 0), 0))
              : 0,
          playerMaxHp: totalStats.hp,
          playerCurrentMp: totalStats.mp,
          playerMaxMp: totalStats.mp,
          playerBuffs: [],
          playerDebuffs: [],
          playerDefending: false,
          enemy,
          enemyCurrentHp: result.result === "victory" ? 0 : enemy.hp,
          enemyMaxHp: enemy.hp,
          enemyBuffs: [],
          enemyDebuffs: [],
          battleLog: result.log,
          result: result.result,
          rewards: rewardConfig
            ? calculateBattleRewards(rewardConfig, result.result === "victory")
            : undefined,
        };

        setBattleState(finalState);
        resolve(finalState);
      });
    },
    [character, battleState]
  );

  /**
   * 선택지 전투 실행
   */
  const executeChoiceBattle = useCallback(
    (
      enemy: Enemy,
      choice: BattleChoice,
      rewardConfig?: BattleRewardConfig
    ): Promise<BattleState> => {
      return new Promise((resolve) => {
        if (!character) {
          resolve(battleState);
          return;
        }

        const result = calculateChoiceBattle(character, choice);
        const totalStats = getTotalStats(character);

        const isVictory =
          result.finalOutcome === "victory" ||
          result.finalOutcome === "partial_victory";

        const finalState: BattleState = {
          isActive: true,
          turn: "player",
          turnCount: 1,
          playerCurrentHp: isVictory ? totalStats.hp : 0,
          playerMaxHp: totalStats.hp,
          playerCurrentMp: totalStats.mp,
          playerMaxMp: totalStats.mp,
          playerBuffs: [],
          playerDebuffs: [],
          playerDefending: false,
          enemy,
          enemyCurrentHp: isVictory ? 0 : enemy.hp,
          enemyMaxHp: enemy.hp,
          enemyBuffs: [],
          enemyDebuffs: [],
          battleLog: [
            {
              turn: 1,
              actor: "player",
              action: choice.choice_text,
              timestamp: new Date().toISOString(),
            },
            {
              turn: 1,
              actor: result.success ? "player" : "enemy",
              action: result.description,
              timestamp: new Date().toISOString(),
            },
          ],
          result:
            result.finalOutcome === "escape"
              ? "fled"
              : isVictory
              ? "victory"
              : "defeat",
          rewards:
            rewardConfig && isVictory
              ? calculateBattleRewards(rewardConfig, true)
              : undefined,
        };

        setBattleState(finalState);
        resolve(finalState);
      });
    },
    [character, battleState]
  );

  /**
   * 보상 설정
   */
  const setRewards = useCallback((rewards: BattleRewards) => {
    setBattleState((prev) => ({
      ...prev,
      rewards,
    }));
  }, []);

  /**
   * 전투 종료 (상태 초기화)
   */
  const endBattle = useCallback(() => {
    setBattleState(initialBattleState);
  }, []);

  /**
   * 전투 재시작 (같은 적과 다시 전투)
   */
  const restartBattle = useCallback(() => {
    if (battleState.enemy) {
      startBattle(battleState.enemy);
    }
  }, [battleState.enemy, startBattle]);

  return {
    battleState,
    startBattle,
    executePlayerAction,
    executeEnemyAction,
    executeAutoBattle,
    executeChoiceBattle,
    setRewards,
    endBattle,
    restartBattle,
  };
};

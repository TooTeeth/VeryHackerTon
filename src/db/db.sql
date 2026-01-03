-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Stream (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  Title text NOT NULL,
  Era text,
  Genre text,
  Plan bigint,
  Players bigint,
  Creator text,
  Image text,
  Platform text,
  Schedule text,
  CONSTRAINT Stream_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_address text NOT NULL UNIQUE,
  CONSTRAINT Users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Vygddrasilchoice (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  mainstream_slug text NOT NULL,
  choice text,
  value text,
  state text,
  CONSTRAINT Vygddrasilchoice_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Vygddrasilstage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  title text,
  CONSTRAINT Vygddrasilstage_pkey PRIMARY KEY (id)
);
CREATE TABLE public.achievements (
  id integer NOT NULL DEFAULT nextval('achievements_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text NOT NULL,
  category character varying NOT NULL,
  icon_url character varying,
  reward_type character varying,
  reward_value jsonb,
  requirement_type character varying NOT NULL,
  requirement_value jsonb NOT NULL,
  sort_order integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admins (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  wallet_address text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.battle_choices (
  id integer NOT NULL DEFAULT nextval('battle_choices_id_seq'::regclass),
  enemy_id integer,
  choice_text text NOT NULL,
  outcome character varying NOT NULL CHECK (outcome::text = ANY (ARRAY['victory'::character varying, 'defeat'::character varying, 'partial_victory'::character varying, 'escape'::character varying]::text[])),
  stat_check_stat character varying CHECK (stat_check_stat::text = ANY (ARRAY['str'::character varying, 'agi'::character varying, 'int'::character varying, 'hp'::character varying, 'mp'::character varying, 'luck'::character varying, NULL::character varying]::text[])),
  stat_check_threshold integer,
  description_success text,
  description_failure text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT battle_choices_pkey PRIMARY KEY (id),
  CONSTRAINT battle_choices_enemy_id_fkey FOREIGN KEY (enemy_id) REFERENCES public.enemies(id)
);
CREATE TABLE public.battle_history (
  id integer NOT NULL DEFAULT nextval('battle_history_id_seq'::regclass),
  character_id integer,
  enemy_id integer,
  battle_mode character varying NOT NULL CHECK (battle_mode::text = ANY (ARRAY['turn-based'::character varying, 'auto'::character varying, 'choice'::character varying]::text[])),
  result character varying NOT NULL CHECK (result::text = ANY (ARRAY['victory'::character varying, 'defeat'::character varying, 'fled'::character varying]::text[])),
  turns_taken integer DEFAULT 0,
  exp_gained integer DEFAULT 0,
  gold_gained integer DEFAULT 0,
  battle_log jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT battle_history_pkey PRIMARY KEY (id),
  CONSTRAINT battle_history_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id),
  CONSTRAINT battle_history_enemy_id_fkey FOREIGN KEY (enemy_id) REFERENCES public.enemies(id)
);
CREATE TABLE public.battle_rewards (
  id integer NOT NULL DEFAULT nextval('battle_rewards_id_seq'::regclass),
  enemy_id integer,
  exp_reward integer DEFAULT 10,
  gold_reward integer DEFAULT 5,
  stat_bonus_type character varying CHECK (stat_bonus_type::text = ANY (ARRAY['str'::character varying, 'agi'::character varying, 'int'::character varying, 'hp'::character varying, 'mp'::character varying, 'luck'::character varying, 'random'::character varying, NULL::character varying]::text[])),
  stat_bonus_value integer DEFAULT 1,
  nft_reward_enabled boolean DEFAULT false,
  nft_contract_address character varying,
  nft_token_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT battle_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT battle_rewards_enemy_id_fkey FOREIGN KEY (enemy_id) REFERENCES public.enemies(id)
);
CREATE TABLE public.character_achievements (
  id integer NOT NULL DEFAULT nextval('character_achievements_id_seq'::regclass),
  character_id integer NOT NULL,
  achievement_id integer NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  reward_claimed boolean DEFAULT false,
  CONSTRAINT character_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT character_achievements_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id),
  CONSTRAINT character_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
CREATE TABLE public.character_daily_quests (
  id integer NOT NULL DEFAULT nextval('character_daily_quests_id_seq'::regclass),
  character_id integer NOT NULL,
  quest_id integer NOT NULL,
  quest_date date NOT NULL DEFAULT CURRENT_DATE,
  current_count integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  reward_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT character_daily_quests_pkey PRIMARY KEY (id),
  CONSTRAINT character_daily_quests_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id),
  CONSTRAINT character_daily_quests_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.daily_quests(id)
);
CREATE TABLE public.character_nfts (
  id integer NOT NULL DEFAULT nextval('character_nfts_id_seq'::regclass),
  character_id integer NOT NULL,
  nft_contract_address character varying NOT NULL,
  nft_token_id character varying NOT NULL,
  acquired_at timestamp without time zone DEFAULT now(),
  CONSTRAINT character_nfts_pkey PRIMARY KEY (id),
  CONSTRAINT character_nfts_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id)
);
CREATE TABLE public.character_statistics (
  id integer NOT NULL DEFAULT nextval('character_statistics_id_seq'::regclass),
  character_id integer NOT NULL UNIQUE,
  total_battles integer DEFAULT 0,
  battles_won integer DEFAULT 0,
  battles_lost integer DEFAULT 0,
  battles_fled integer DEFAULT 0,
  total_damage_dealt bigint DEFAULT 0,
  total_damage_received bigint DEFAULT 0,
  critical_hits integer DEFAULT 0,
  dodges integer DEFAULT 0,
  total_stages_visited integer DEFAULT 0,
  unique_stages_visited integer DEFAULT 0,
  total_choices_made integer DEFAULT 0,
  total_gold_earned integer DEFAULT 0,
  total_gold_spent integer DEFAULT 0,
  total_exp_earned integer DEFAULT 0,
  longest_win_streak integer DEFAULT 0,
  current_win_streak integer DEFAULT 0,
  highest_damage_single_hit integer DEFAULT 0,
  fastest_battle_win_turns integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT character_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT character_statistics_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id)
);
CREATE TABLE public.collection_items (
  id integer NOT NULL DEFAULT nextval('collection_items_id_seq'::regclass),
  category character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  image_url text,
  nft_contract_address character varying,
  nft_token_id character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT collection_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_quests (
  id integer NOT NULL DEFAULT nextval('daily_quests_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text NOT NULL,
  quest_type character varying NOT NULL,
  target_count integer NOT NULL,
  reward_gold integer DEFAULT 0,
  reward_exp integer DEFAULT 0,
  reward_stat_type character varying,
  reward_stat_value integer DEFAULT 0,
  difficulty character varying DEFAULT 'normal'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_quests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.enemies (
  id integer NOT NULL DEFAULT nextval('enemies_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  image_url character varying,
  level integer DEFAULT 1,
  str integer DEFAULT 10,
  agi integer DEFAULT 10,
  int integer DEFAULT 10,
  hp integer DEFAULT 100,
  mp integer DEFAULT 50,
  luck integer DEFAULT 5,
  attack_type character varying DEFAULT 'physical'::character varying CHECK (attack_type::text = ANY (ARRAY['physical'::character varying, 'magical'::character varying, 'mixed'::character varying]::text[])),
  stage_slug character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT enemies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.game_operators (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  game_id text NOT NULL,
  wallet_address text NOT NULL,
  role text NOT NULL DEFAULT 'operator'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT game_operators_pkey PRIMARY KEY (id)
);
CREATE TABLE public.game_progress (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_address text NOT NULL,
  game_id text NOT NULL,
  current_stage text NOT NULL,
  visited_stages ARRAY DEFAULT ARRAY[]::text[],
  choices_made jsonb DEFAULT '[]'::jsonb,
  character_id bigint,
  CONSTRAINT game_progress_pkey PRIMARY KEY (id),
  CONSTRAINT fk_character_id FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id)
);
CREATE TABLE public.gold_balances (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  wallet_address text NOT NULL,
  token_symbol text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gold_balances_pkey PRIMARY KEY (id),
  CONSTRAINT gold_balances_wallet_address_fkey FOREIGN KEY (wallet_address) REFERENCES public.Users(wallet_address)
);
CREATE TABLE public.leaderboard (
  id integer NOT NULL DEFAULT nextval('leaderboard_id_seq'::regclass),
  character_id integer NOT NULL UNIQUE,
  wallet_address character varying NOT NULL,
  nickname character varying NOT NULL,
  class character varying NOT NULL,
  level integer NOT NULL DEFAULT 1,
  exp integer NOT NULL DEFAULT 0,
  total_battles integer DEFAULT 0,
  battles_won integer DEFAULT 0,
  total_gold_earned integer DEFAULT 0,
  stages_visited integer DEFAULT 0,
  rank_position integer,
  score bigint DEFAULT ((level * 1000) + exp),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leaderboard_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id)
);
CREATE TABLE public.liquidity_pools (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  token_a text NOT NULL,
  token_b text NOT NULL DEFAULT 'VTDN'::text,
  reserve_a numeric NOT NULL DEFAULT 0,
  reserve_b numeric NOT NULL DEFAULT 0,
  total_liquidity numeric DEFAULT 0,
  fee_percent numeric DEFAULT 0.003,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT liquidity_pools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.nft_listings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contract_address text NOT NULL,
  token_id text NOT NULL,
  seller_address text NOT NULL,
  sale_type text NOT NULL CHECK (sale_type = ANY (ARRAY['fixed'::text, 'auction'::text])),
  price text,
  starting_price text,
  current_bid text,
  highest_bidder text,
  end_time timestamp with time zone,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'sold'::text, 'cancelled'::text, 'ended'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  amount bigint,
  bonus_str integer DEFAULT 0,
  bonus_agi integer DEFAULT 0,
  bonus_int integer DEFAULT 0,
  bonus_hp integer DEFAULT 0,
  bonus_mp integer DEFAULT 0,
  bonus_luck integer DEFAULT 0,
  CONSTRAINT nft_listings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.nft_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  listing_id uuid,
  contract_address text NOT NULL,
  token_id text NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  price text NOT NULL,
  transaction_hash text NOT NULL UNIQUE,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['listing'::text, 'buy'::text, 'sell'::text, 'bid'::text, 'cancel'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nft_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT nft_transactions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.nft_listings(id)
);
CREATE TABLE public.notifications (
  id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
  character_id integer NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  icon character varying,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.vygddrasilclass(id)
);
CREATE TABLE public.proposal_votes (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  proposal_id integer NOT NULL,
  wallet_address text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['up'::text, 'down'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposal_votes_pkey PRIMARY KEY (id),
  CONSTRAINT proposal_votes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id)
);
CREATE TABLE public.proposals (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  game_id text NOT NULL,
  stage_slug text,
  title text NOT NULL,
  description text,
  proposer_wallet text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  admin_notes text,
  converted_session_id integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.redirects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  url text,
  image text,
  Adsvalue numeric,
  total_Adsvalue numeric,
  claimed_by text,
  CONSTRAINT redirects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.swap_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  wallet_address text NOT NULL,
  pool_id bigint NOT NULL,
  token_in text NOT NULL,
  token_out text NOT NULL,
  amount_in numeric NOT NULL,
  amount_out numeric NOT NULL,
  fee_amount numeric NOT NULL,
  price_impact numeric,
  reserve_a_before numeric,
  reserve_b_before numeric,
  reserve_a_after numeric,
  reserve_b_after numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT swap_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT swap_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.liquidity_pools(id),
  CONSTRAINT swap_transactions_wallet_address_fkey FOREIGN KEY (wallet_address) REFERENCES public.Users(wallet_address)
);
CREATE TABLE public.votes (
  id integer NOT NULL DEFAULT nextval('votes_id_seq'::regclass),
  session_id integer NOT NULL,
  option_id integer NOT NULL,
  wallet_address character varying NOT NULL,
  character_id integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  CONSTRAINT votes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.voting_sessions(id),
  CONSTRAINT votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.voting_options(id)
);
CREATE TABLE public.voting_options (
  id integer NOT NULL DEFAULT nextval('voting_options_id_seq'::regclass),
  session_id integer NOT NULL,
  choice_id integer NOT NULL,
  choice_text character varying NOT NULL,
  vote_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT voting_options_pkey PRIMARY KEY (id),
  CONSTRAINT voting_options_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.voting_sessions(id)
);
CREATE TABLE public.voting_sessions (
  id integer NOT NULL DEFAULT nextval('voting_sessions_id_seq'::regclass),
  stage_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  game_id text DEFAULT 'vygddrasil'::text,
  CONSTRAINT voting_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vtdn (
  user_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  vtdn_balance numeric UNIQUE,
  CONSTRAINT vtdn_pkey PRIMARY KEY (user_id),
  CONSTRAINT vtdn_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.Users(id)
);
CREATE TABLE public.vygddrasilclass (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  str numeric,
  agi numeric,
  int numeric,
  hp numeric,
  mp numeric,
  luck numeric,
  wallet_address text,
  class text,
  nickname character varying,
  equipped_nft_id integer,
  bonus_str integer DEFAULT 0,
  bonus_agi integer DEFAULT 0,
  bonus_int integer DEFAULT 0,
  bonus_hp integer DEFAULT 0,
  bonus_mp integer DEFAULT 0,
  bonus_luck integer DEFAULT 0,
  equipped_nft_token_id character varying,
  equipped_nft_contract character varying,
  equipped_nft_name character varying,
  equipped_nft_image text,
  equipped_nft_description text,
  equipped_nft_category character varying,
  equipped_nfts jsonb DEFAULT '{}'::jsonb,
  exp integer DEFAULT 0,
  gold integer DEFAULT 0,
  level integer DEFAULT 1,
  CONSTRAINT vygddrasilclass_pkey PRIMARY KEY (id)
);
CREATE TABLE public.withdraw_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  withdraw_requests_vtdn numeric,
  user_address text,
  status text,
  vtdnbalance numeric,
  CONSTRAINT withdraw_requests_pkey PRIMARY KEY (id),
  CONSTRAINT withdraw_requests_user_address_fkey FOREIGN KEY (user_address) REFERENCES public.Users(wallet_address)
);
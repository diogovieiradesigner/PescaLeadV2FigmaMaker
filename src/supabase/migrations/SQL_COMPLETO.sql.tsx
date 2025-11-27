--
-- PostgreSQL database dump
--

\restrict QxvJhhy7cdim7oSejJkSv582FGCaUypG1k72wxe1bR2Dhs5b19sarjRhibxGNmS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: pgmq; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgmq;


ALTER SCHEMA pgmq OWNER TO postgres;

--
-- Name: pgmq_public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgmq_public;


ALTER SCHEMA pgmq_public OWNER TO postgres;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: http; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA public;


--
-- Name: EXTENSION http; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION http IS 'HTTP client for PostgreSQL, allows web page retrieval inside the database.';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgmq; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;


--
-- Name: EXTENSION pgmq; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgmq IS 'A lightweight message queue. Like AWS SQS and RSMQ but on Postgres.';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: archive(text, bigint); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.archive(queue_name text, message_id bigint) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return pgmq.archive( queue_name := queue_name, msg_id := message_id ); end; $$;


ALTER FUNCTION pgmq_public.archive(queue_name text, message_id bigint) OWNER TO postgres;

--
-- Name: FUNCTION archive(queue_name text, message_id bigint); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.archive(queue_name text, message_id bigint) IS 'Archives a message by moving it from the queue to a permanent archive.';


--
-- Name: delete(text, bigint); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.delete(queue_name text, message_id bigint) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return pgmq.delete( queue_name := queue_name, msg_id := message_id ); end; $$;


ALTER FUNCTION pgmq_public.delete(queue_name text, message_id bigint) OWNER TO postgres;

--
-- Name: FUNCTION delete(queue_name text, message_id bigint); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.delete(queue_name text, message_id bigint) IS 'Permanently deletes a message from the specified queue.';


--
-- Name: pop(text); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.pop(queue_name text) RETURNS SETOF pgmq.message_record
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return query select * from pgmq.pop( queue_name := queue_name ); end; $$;


ALTER FUNCTION pgmq_public.pop(queue_name text) OWNER TO postgres;

--
-- Name: FUNCTION pop(queue_name text); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.pop(queue_name text) IS 'Retrieves and locks the next message from the specified queue.';


--
-- Name: read(text, integer, integer); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) RETURNS SETOF pgmq.message_record
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return query select * from pgmq.read( queue_name := queue_name, vt := sleep_seconds, qty := n , conditional := '{}'::jsonb ); end; $$;


ALTER FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) OWNER TO postgres;

--
-- Name: FUNCTION read(queue_name text, sleep_seconds integer, n integer); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) IS 'Reads up to "n" messages from the specified queue with an optional "sleep_seconds" (visibility timeout).';


--
-- Name: send(text, jsonb, integer); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer DEFAULT 0) RETURNS SETOF bigint
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return query select * from pgmq.send( queue_name := queue_name, msg := message, delay := sleep_seconds ); end; $$;


ALTER FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) OWNER TO postgres;

--
-- Name: FUNCTION send(queue_name text, message jsonb, sleep_seconds integer); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) IS 'Sends a message to the specified queue, optionally delaying its availability by a number of seconds.';


--
-- Name: send_batch(text, jsonb[], integer); Type: FUNCTION; Schema: pgmq_public; Owner: postgres
--

CREATE FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer DEFAULT 0) RETURNS SETOF bigint
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin return query select * from pgmq.send_batch( queue_name := queue_name, msgs := messages, delay := sleep_seconds ); end; $$;


ALTER FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) OWNER TO postgres;

--
-- Name: FUNCTION send_batch(queue_name text, messages jsonb[], sleep_seconds integer); Type: COMMENT; Schema: pgmq_public; Owner: postgres
--

COMMENT ON FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) IS 'Sends a batch of messages to the specified queue, optionally delaying their availability by a number of seconds.';


--
-- Name: auto_generate_workspace_slug(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_generate_workspace_slug() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_workspace_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_generate_workspace_slug() OWNER TO postgres;

--
-- Name: consume_enrichment_queue(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.consume_enrichment_queue() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  msg RECORD;
  http_result RECORD;
  processed_count INTEGER := 0;
  service_key TEXT;
  project_url TEXT := 'https://nlbcwaxkeaddfocigwuk.supabase.co';
BEGIN
  -- Pegar service role key
  BEGIN
    service_key := public.get_service_role_key();
    
    IF service_key IS NULL OR service_key = '' THEN
      RAISE WARNING 'Service Role Key não configurada';
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao acessar Service Role Key: %', SQLERRM;
    RETURN;
  END;

  -- Ler até 20 mensagens (timeout 120s)
  FOR msg IN 
    SELECT msg_id, message
    FROM pgmq.read('enrichment_queue', 20, 120)
  LOOP
    BEGIN
      -- Chamar Edge Function enrich-lead
      SELECT status, content INTO http_result
      FROM http((
        'POST',
        project_url || '/functions/v1/enrich-lead',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || service_key)
        ],
        'application/json',
        msg.message::text
      )::http_request);
      
      -- Se sucesso, deletar da fila
      IF http_result.status BETWEEN 200 AND 299 THEN
        PERFORM pgmq.delete('enrichment_queue', msg.msg_id);
        processed_count := processed_count + 1;
        
        RAISE NOTICE 'Enriquecido lead da mensagem %', msg.msg_id;
      ELSE
        RAISE WARNING 'Edge Function enrich-lead retornou HTTP %: %', 
          http_result.status, http_result.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar mensagem %: %', msg.msg_id, SQLERRM;
    END;
  END LOOP;
  
  IF processed_count > 0 THEN
    RAISE NOTICE '[enrichment_queue] Enriquecidos % leads', processed_count;
  END IF;
END;
$$;


ALTER FUNCTION public.consume_enrichment_queue() OWNER TO postgres;

--
-- Name: FUNCTION consume_enrichment_queue(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.consume_enrichment_queue() IS 'Processa mensagens da fila enrichment_queue chamando Edge Function enrich-lead';


--
-- Name: create_custom_fields_from_staging(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_custom_fields_from_staging() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  field_key TEXT;
  field_value TEXT;
  v_custom_field_id UUID;  -- ✅ Renomeado para evitar ambiguidade
  staging_record RECORD;
  max_position INTEGER;
BEGIN
  -- Buscar dados do staging
  SELECT extracted_data, enrichment_data 
  INTO staging_record
  FROM lead_extraction_staging 
  WHERE migrated_lead_id = NEW.id
  LIMIT 1;
  
  IF staging_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(MAX(position), 0) INTO max_position
  FROM custom_fields
  WHERE workspace_id = NEW.workspace_id;
  
  -- ========================================
  -- 1. Processar extracted_data
  -- ========================================
  IF staging_record.extracted_data IS NOT NULL THEN
    FOR field_key, field_value IN 
      SELECT * FROM jsonb_each_text(staging_record.extracted_data)
    LOOP
      SELECT id INTO v_custom_field_id
      FROM custom_fields
      WHERE workspace_id = NEW.workspace_id
        AND name = field_key
      LIMIT 1;
      
      IF v_custom_field_id IS NULL THEN
        max_position := max_position + 1;
        
        INSERT INTO custom_fields (
          workspace_id, 
          name, 
          field_type, 
          is_required, 
          position
        )
        VALUES (
          NEW.workspace_id, 
          field_key, 
          CASE 
            WHEN field_key IN ('email', 'e-mail') THEN 'email'
            WHEN field_key IN ('phone', 'telefone', 'celular') THEN 'phone'
            WHEN field_key IN ('website', 'site', 'url') THEN 'url'
            ELSE 'text'
          END,
          false,
          max_position
        )
        RETURNING id INTO v_custom_field_id;
      END IF;
      
      INSERT INTO lead_custom_values (lead_id, custom_field_id, value)
      VALUES (NEW.id, v_custom_field_id, field_value)
      ON CONFLICT (lead_id, custom_field_id) 
      DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = NOW();
    END LOOP;
  END IF;
  
  -- ========================================
  -- 2. Processar enrichment_data
  -- ========================================
  IF staging_record.enrichment_data IS NOT NULL THEN
    FOR field_key, field_value IN 
      SELECT * FROM jsonb_each_text(staging_record.enrichment_data)
    LOOP
      SELECT id INTO v_custom_field_id
      FROM custom_fields
      WHERE workspace_id = NEW.workspace_id
        AND name = field_key
      LIMIT 1;
      
      IF v_custom_field_id IS NULL THEN
        max_position := max_position + 1;
        
        INSERT INTO custom_fields (
          workspace_id, 
          name, 
          field_type, 
          is_required, 
          position
        )
        VALUES (
          NEW.workspace_id, 
          field_key, 
          'text',
          false,
          max_position
        )
        RETURNING id INTO v_custom_field_id;
      END IF;
      
      INSERT INTO lead_custom_values (lead_id, custom_field_id, value)
      VALUES (NEW.id, v_custom_field_id, field_value)
      ON CONFLICT (lead_id, custom_field_id) 
      DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = NOW();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_custom_fields_from_staging() OWNER TO postgres;

--
-- Name: create_custom_fields_from_staging(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_custom_fields_from_staging(p_workspace_id uuid, p_field_mappings jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  field_mapping jsonb;
  field_name text;
  field_type text;
BEGIN
  FOR field_mapping IN SELECT * FROM jsonb_array_elements(p_field_mappings)
  LOOP
    field_name := field_mapping->>'name';
    field_type := field_mapping->>'type';
    
    INSERT INTO public.custom_fields (
      workspace_id,
      name,
      field_type,
      is_required,
      position
    ) VALUES (
      p_workspace_id,
      field_name,
      field_type,
      false,
      (SELECT COALESCE(MAX(position), 0) + 1 FROM public.custom_fields WHERE workspace_id = p_workspace_id)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;


ALTER FUNCTION public.create_custom_fields_from_staging(p_workspace_id uuid, p_field_mappings jsonb) OWNER TO postgres;

--
-- Name: delete_orphan_workspaces(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_orphan_workspaces() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  DELETE FROM public.workspaces
  WHERE owner_id = OLD.user_id
  AND owner_id NOT IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_id = OLD.workspace_id
  );
  RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_orphan_workspaces() OWNER TO postgres;

--
-- Name: enqueue_enrichment_leads(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enqueue_enrichment_leads() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  lead RECORD;
  enqueued_count INTEGER := 0;
  msg_id BIGINT;
BEGIN
  -- Buscar leads prontos para enriquecimento
  FOR lead IN
    SELECT 
      id,
      extraction_run_id,
      workspace_id,
      extracted_data
    FROM public.lead_extraction_staging
    WHERE status_enrichment = 'pending'
      AND status_extraction = 'ready'
      AND filter_passed = true
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    -- Enfileirar mensagem
    msg_id := public.pgmq_send(
      'enrichment_queue',
      jsonb_build_object(
        'lead_id', lead.id,
        'run_id', lead.extraction_run_id,
        'workspace_id', lead.workspace_id,
        'data', lead.extracted_data
      )
    );
    
    -- Se enfileirou com sucesso, marcar como 'enriching'
    IF msg_id IS NOT NULL THEN
      UPDATE public.lead_extraction_staging
      SET status_enrichment = 'enriching'
      WHERE id = lead.id;
      
      enqueued_count := enqueued_count + 1;
    END IF;
  END LOOP;
  
  IF enqueued_count > 0 THEN
    RAISE NOTICE '[enrichment_queue] Enfileirados % leads', enqueued_count;
  END IF;
END;
$$;


ALTER FUNCTION public.enqueue_enrichment_leads() OWNER TO postgres;

--
-- Name: FUNCTION enqueue_enrichment_leads(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.enqueue_enrichment_leads() IS 'Busca leads prontos em staging e enfileira para enriquecimento';


--
-- Name: generate_workspace_slug(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_workspace_slug(workspace_name text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;


ALTER FUNCTION public.generate_workspace_slug(workspace_name text) OWNER TO postgres;

--
-- Name: get_extraction_progress(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_extraction_progress(p_run_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- Agregar contadores por status
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status_extraction = 'pending'),
    'google_fetched', COUNT(*) FILTER (WHERE status_extraction = 'google_fetched'),
    'scraping', COUNT(*) FILTER (WHERE status_extraction = 'scraping'),
    'scraped', COUNT(*) FILTER (WHERE status_extraction = 'scraped'),
    'ready', COUNT(*) FILTER (WHERE status_extraction = 'ready'),
    'filtered_out', COUNT(*) FILTER (WHERE status_extraction = 'filtered_out'),
    
    'enrichment_pending', COUNT(*) FILTER (WHERE status_enrichment = 'pending'),
    'enrichment_enriching', COUNT(*) FILTER (WHERE status_enrichment = 'enriching'),
    'enrichment_completed', COUNT(*) FILTER (WHERE status_enrichment = 'completed'),
    'enrichment_failed', COUNT(*) FILTER (WHERE status_enrichment = 'failed'),
    
    'filter_passed', COUNT(*) FILTER (WHERE filter_passed = true),
    'filter_failed', COUNT(*) FILTER (WHERE filter_passed = false),
    
    'should_migrate', COUNT(*) FILTER (WHERE should_migrate = true),
    'migrated', COUNT(*) FILTER (WHERE migrated_at IS NOT NULL)
  ) INTO result
  FROM public.lead_extraction_staging
  WHERE extraction_run_id = p_run_id;
  
  RETURN result;
END;
$$;


ALTER FUNCTION public.get_extraction_progress(p_run_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_extraction_progress(p_run_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_extraction_progress(p_run_id uuid) IS 'Retorna estatísticas em tempo real de uma extração específica';


--
-- Name: get_funnel_column_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_funnel_column_stats(p_funnel_id uuid) RETURNS TABLE(column_id uuid, column_title text, lead_count bigint, total_value numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Buscar workspace_id do funil
  SELECT workspace_id INTO v_workspace_id
  FROM funnels
  WHERE id = p_funnel_id;

  -- Se o funil não existe, retornar vazio
  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- ✅ Retornar stats por coluna
  RETURN QUERY
  SELECT 
    fc.id AS column_id,
    fc.title AS column_title,
    COUNT(l.id) AS lead_count,
    COALESCE(SUM(l.deal_value), 0) AS total_value
  FROM funnel_columns fc
  LEFT JOIN leads l ON l.column_id = fc.id 
    AND l.funnel_id = p_funnel_id 
    AND l.workspace_id = v_workspace_id
  WHERE fc.funnel_id = p_funnel_id
  GROUP BY fc.id, fc.title, fc.position
  ORDER BY fc.position;
END;
$$;


ALTER FUNCTION public.get_funnel_column_stats(p_funnel_id uuid) OWNER TO postgres;

--
-- Name: get_funnel_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_funnel_stats(p_funnel_id uuid) RETURNS TABLE(total_leads bigint, total_value numeric, high_priority_count bigint, active_leads bigint, conversion_rate numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_workspace_id uuid;
  v_total_leads bigint;
  v_total_value numeric;
  v_high_priority bigint;
  v_converted_leads bigint;
  v_conversion_rate numeric;
BEGIN
  -- Buscar workspace_id do funil
  SELECT workspace_id INTO v_workspace_id
  FROM funnels
  WHERE id = p_funnel_id;

  -- Se o funil não existe, retornar zeros
  IF v_workspace_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  -- ✅ Calcular total de leads
  SELECT COUNT(*)
  INTO v_total_leads
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- ✅ Calcular valor total
  SELECT COALESCE(SUM(deal_value), 0)
  INTO v_total_value
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- ✅ Calcular alta prioridade
  SELECT COUNT(*)
  INTO v_high_priority
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id
    AND priority = 'high';

  -- ✅ Calcular leads convertidos
  SELECT COUNT(*)
  INTO v_converted_leads
  FROM leads l
  INNER JOIN funnel_columns fc ON l.column_id = fc.id
  WHERE l.funnel_id = p_funnel_id
    AND l.workspace_id = v_workspace_id
    AND (
      LOWER(fc.title) LIKE '%ganho%' OR
      LOWER(fc.title) LIKE '%fechado%' OR
      LOWER(fc.title) LIKE '%won%'
    );

  -- ✅ Calcular taxa de conversão
  IF v_total_leads > 0 THEN
    v_conversion_rate := ROUND((v_converted_leads::numeric / v_total_leads::numeric) * 100, 0);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Retornar resultados
  RETURN QUERY
  SELECT 
    v_total_leads,
    v_total_value,
    v_high_priority,
    v_total_leads, -- active_leads = total_leads
    v_conversion_rate;
END;
$$;


ALTER FUNCTION public.get_funnel_stats(p_funnel_id uuid) OWNER TO postgres;

--
-- Name: get_my_email(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_email() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;


ALTER FUNCTION public.get_my_email() OWNER TO postgres;

--
-- Name: get_serpdev_api_key(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_serpdev_api_key(key_index integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  key_name TEXT;
  key_value TEXT;
BEGIN
  -- Montar nome da chave
  key_name := 'SERPDEV_API_KEY_' || LPAD(key_index::TEXT, 2, '0');
  
  -- Buscar do Vault
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = key_name;
  
  RETURN key_value;
END;
$$;


ALTER FUNCTION public.get_serpdev_api_key(key_index integer) OWNER TO postgres;

--
-- Name: get_service_role_key(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_service_role_key() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Service Role Key armazenada diretamente na função
  RETURN 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2OTI0OSwiZXhwIjoyMDc5MTQ1MjQ5fQ.YzgZfIGgCz4TViDycHc7qblrF6fYPA7tT8qbmjSe5F4';
END;
$$;


ALTER FUNCTION public.get_service_role_key() OWNER TO postgres;

--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(workspace_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $_$
  SELECT role FROM workspace_members
  WHERE workspace_members.workspace_id = $1
  AND workspace_members.user_id = auth.uid()
  LIMIT 1;
$_$;


ALTER FUNCTION public.get_user_role(workspace_id uuid) OWNER TO postgres;

--
-- Name: get_user_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(p_workspace_id uuid, p_user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id 
  AND user_id = p_user_id;
  
  RETURN user_role;
END;
$$;


ALTER FUNCTION public.get_user_role(p_workspace_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: has_write_permission(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_write_permission(workspace_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $_$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role($1);
  RETURN user_role IN ('owner', 'admin', 'member');
END;
$_$;


ALTER FUNCTION public.has_write_permission(workspace_id uuid) OWNER TO postgres;

--
-- Name: has_write_permission(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_write_permission(p_workspace_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role(p_workspace_id, p_user_id);
  RETURN user_role IN ('owner', 'admin', 'member');
END;
$$;


ALTER FUNCTION public.has_write_permission(p_workspace_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: increment_run_metrics(uuid, integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_run_metrics(p_run_id uuid, p_pages integer, p_found integer, p_created integer, p_duplicates integer, p_filtered integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE lead_extraction_runs
  SET 
    pages_consumed = pages_consumed + p_pages,
    found_quantity = found_quantity + p_found,
    created_quantity = created_quantity + p_created,
    duplicates_skipped = duplicates_skipped + p_duplicates,
    filtered_out = filtered_out + p_filtered
  WHERE id = p_run_id;
END;
$$;


ALTER FUNCTION public.increment_run_metrics(p_run_id uuid, p_pages integer, p_found integer, p_created integer, p_duplicates integer, p_filtered integer) OWNER TO postgres;

--
-- Name: is_admin_or_owner(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin_or_owner(workspace_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $_$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role($1);
  RETURN user_role IN ('owner', 'admin');
END;
$_$;


ALTER FUNCTION public.is_admin_or_owner(workspace_id uuid) OWNER TO postgres;

--
-- Name: is_admin_or_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin_or_owner(p_workspace_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role(p_workspace_id, p_user_id);
  RETURN user_role IN ('owner', 'admin');
END;
$$;


ALTER FUNCTION public.is_admin_or_owner(p_workspace_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: is_owner(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_owner(workspace_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $_$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role($1);
  RETURN user_role = 'owner';
END;
$_$;


ALTER FUNCTION public.is_owner(workspace_id uuid) OWNER TO postgres;

--
-- Name: is_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_owner(p_workspace_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = p_workspace_id 
    AND owner_id = p_user_id
  );
END;
$$;


ALTER FUNCTION public.is_owner(p_workspace_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: is_workspace_member(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_workspace_member(workspace_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = $1
    AND workspace_members.user_id = auth.uid()
  );
END;
$_$;


ALTER FUNCTION public.is_workspace_member(workspace_id uuid) OWNER TO postgres;

--
-- Name: is_workspace_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: log_lead_creation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_lead_creation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.lead_activities (
    lead_id,
    user_id,
    activity_type,
    metadata
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'created',
    jsonb_build_object('lead_id', NEW.id)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_lead_creation() OWNER TO postgres;

--
-- Name: log_lead_move(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_lead_move() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    INSERT INTO public.lead_activities (
      lead_id,
      user_id,
      activity_type,
      metadata
    ) VALUES (
      NEW.id,
      NEW.updated_by,
      'moved',
      jsonb_build_object(
        'from_column', OLD.column_id,
        'to_column', NEW.column_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_lead_move() OWNER TO postgres;

--
-- Name: migrate_staging_to_leads(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.migrate_staging_to_leads() RETURNS TABLE(migrated_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  staging_record RECORD;
  new_lead_id UUID;
  migrated INTEGER := 0;
BEGIN
  -- Loop pelos leads prontos para migração
  FOR staging_record IN
    SELECT *
    FROM public.lead_extraction_staging
    WHERE should_migrate = true
      AND migrated_at IS NULL
      AND status_extraction = 'google_fetched'
    LIMIT 100
  LOOP
    BEGIN
      -- Inserir na tabela leads
      INSERT INTO public.leads (
        workspace_id,
        funnel_id,
        column_id,
        client_name,
        company,
        lead_extraction_id,
        lead_extraction_run_id,
        created_at
      )
      SELECT
        s.workspace_id,
        e.funnel_id,
        e.column_id,
        s.client_name,
        COALESCE(s.company, s.client_name),
        e.id,
        s.extraction_run_id,
        NOW()
      FROM public.lead_extraction_staging s
      JOIN public.lead_extraction_runs r ON r.id = s.extraction_run_id
      JOIN public.lead_extractions e ON e.id = r.extraction_id
      WHERE s.id = staging_record.id
      RETURNING id INTO new_lead_id;
      
      -- Marcar como migrado
      UPDATE public.lead_extraction_staging
      SET 
        migrated_lead_id = new_lead_id,
        migrated_at = NOW()
      WHERE id = staging_record.id;
      
      migrated := migrated + 1;
      
      RAISE NOTICE 'Migrado lead: % -> %', staging_record.client_name, new_lead_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao migrar lead %: %', staging_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT migrated;
END;
$$;


ALTER FUNCTION public.migrate_staging_to_leads() OWNER TO postgres;

--
-- Name: pgmq_delete_msg(text, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgmq_delete_msg(queue_name text, msg_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT pgmq.delete(queue_name, msg_id) INTO result;
  RETURN result;
END;
$$;


ALTER FUNCTION public.pgmq_delete_msg(queue_name text, msg_id bigint) OWNER TO postgres;

--
-- Name: pgmq_read_batch(text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(q))
  INTO result
  FROM pgmq.read(queue_name, visibility_timeout, qty) q;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION public.pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer) OWNER TO postgres;

--
-- Name: pgmq_send(text, jsonb, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgmq_send(queue_name text, message jsonb, delay_seconds integer DEFAULT 0) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  msg_id BIGINT;
BEGIN
  -- Enfileirar mensagem usando pgmq.send
  SELECT pgmq.send(queue_name, message, delay_seconds) INTO msg_id;
  
  RETURN msg_id;
END;
$$;


ALTER FUNCTION public.pgmq_send(queue_name text, message jsonb, delay_seconds integer) OWNER TO postgres;

--
-- Name: FUNCTION pgmq_send(queue_name text, message jsonb, delay_seconds integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.pgmq_send(queue_name text, message jsonb, delay_seconds integer) IS 'Helper para enviar mensagens para filas PGMQ com tratamento de erro';


--
-- Name: process_google_maps_queue(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_google_maps_queue() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  msg RECORD;
  http_result RECORD;
  processed_count INTEGER := 0;
  service_key TEXT;
  project_url TEXT := 'https://nlbcwaxkeaddfocigwuk.supabase.co';
BEGIN
  RAISE NOTICE '[CRON] Iniciando processamento da fila google_maps_queue';
  
  -- Pegar service role key
  BEGIN
    service_key := public.get_service_role_key();
    
    IF service_key IS NULL OR service_key = '' THEN
      RAISE WARNING '[CRON] Service Role Key não configurada';
      RETURN;
    END IF;
    
    RAISE NOTICE '[CRON] Service key OK - % caracteres', LENGTH(service_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[CRON] Erro ao acessar Service Role Key: %', SQLERRM;
    RETURN;
  END;

  -- Ler mensagens da fila
  RAISE NOTICE '[CRON] Lendo mensagens da fila...';
  
  FOR msg IN 
    SELECT msg_id, message
    FROM pgmq.read('google_maps_queue', 10, 120)
  LOOP
    BEGIN
      RAISE NOTICE '[CRON] Processando mensagem %', msg.msg_id;
      
      -- Chamar Edge Function
      SELECT status, content INTO http_result
      FROM http((
        'POST',
        project_url || '/functions/v1/fetch-google-maps',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || service_key)
        ],
        'application/json',
        msg.message::text
      )::http_request);
      
      RAISE NOTICE '[CRON] HTTP Status: %', http_result.status;
      
      -- Se sucesso, deletar da fila
      IF http_result.status BETWEEN 200 AND 299 THEN
        PERFORM pgmq.delete('google_maps_queue', msg.msg_id);
        processed_count := processed_count + 1;
        RAISE NOTICE '[CRON] ✅ Mensagem % processada com sucesso', msg.msg_id;
      ELSE
        RAISE WARNING '[CRON] ❌ Edge Function retornou HTTP % para msg %: %', 
          http_result.status, msg.msg_id, LEFT(http_result.content::text, 200);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[CRON] ❌ Erro ao processar mensagem %: %', msg.msg_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[CRON] Processamento concluído - % mensagens processadas', processed_count;
END;
$$;


ALTER FUNCTION public.process_google_maps_queue() OWNER TO postgres;

--
-- Name: FUNCTION process_google_maps_queue(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.process_google_maps_queue() IS 'Processa mensagens da fila google_maps_queue chamando Edge Function fetch-google-maps';


--
-- Name: reorder_leads_in_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reorder_leads_in_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Quando um lead é movido para uma nova coluna
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    -- Incrementar position de todos os leads na coluna de destino que estão na posição ou depois
    UPDATE leads
    SET position = position + 1
    WHERE column_id = NEW.column_id
    AND position >= NEW.position
    AND id != NEW.id;
    
    -- Reordenar coluna antiga (preencher gap)
    UPDATE leads
    SET position = position - 1
    WHERE column_id = OLD.column_id
    AND position > OLD.position;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.reorder_leads_in_column() OWNER TO postgres;

--
-- Name: reorder_leads_in_column(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reorder_leads_in_column(p_lead_id uuid, p_new_column_id uuid, p_new_position integer) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.leads
  SET 
    column_id = p_new_column_id,
    position = p_new_position,
    updated_at = now()
  WHERE id = p_lead_id;
END;
$$;


ALTER FUNCTION public.reorder_leads_in_column(p_lead_id uuid, p_new_column_id uuid, p_new_position integer) OWNER TO postgres;

--
-- Name: trigger_process_google_maps_queue(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_process_google_maps_queue() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  response JSONB;
BEGIN
  -- Fazer requisição HTTP para a Edge Function
  SELECT content::jsonb INTO response
  FROM http((
    'POST',
    'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-google-maps-queue',
    ARRAY[
      http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjkyNDksImV4cCI6MjA3OTE0NTI0OX0.BoTSbJgFVb2XWNBVOcNv75JAKrwwMlNGJWETQYyMNFg'),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::http_request);
  
  -- Log do resultado
  RAISE NOTICE 'Cron executado: %', response;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao executar Cron: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.trigger_process_google_maps_queue() OWNER TO postgres;

--
-- Name: trigger_process_queue(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_process_queue() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_request_id bigint;
  v_service_key text;
  v_headers jsonb;
BEGIN
  -- Tentar pegar do Vault primeiro
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;
  
  -- Se não encontrou no Vault, usar configuração alternativa
  IF v_service_key IS NULL THEN
    -- Pegar do setting do database (fallback)
    BEGIN
      v_service_key := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      v_service_key := NULL;
    END;
  END IF;
  
  -- Construir headers
  IF v_service_key IS NOT NULL THEN
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    );
  ELSE
    -- Sem autenticação (vai funcionar se Edge Function tiver verify_jwt = false)
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json'
    );
    RAISE WARNING 'Service key not found! Request may fail auth.';
  END IF;
  
  -- Fazer request HTTP
  SELECT net.http_post(
    url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-google-maps-queue',
    headers := v_headers,
    body := '{}'::jsonb
  ) INTO v_request_id;
  
  RAISE NOTICE 'Queue processing triggered: request_id %', v_request_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error triggering queue: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.trigger_process_queue() OWNER TO postgres;

--
-- Name: FUNCTION trigger_process_queue(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.trigger_process_queue() IS 'Trigger para processar fila google_maps_queue via Edge Function. Chamado pelo cron a cada 10 segundos.';


--
-- Name: update_lead_extraction_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_lead_extraction_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_lead_extraction_updated_at() OWNER TO postgres;

--
-- Name: update_lead_last_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_lead_last_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.leads
  SET last_activity_at = now()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_lead_last_activity() OWNER TO postgres;

--
-- Name: update_staging_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_staging_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_staging_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_workspace_owner(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_workspace_owner() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Owner must be a valid user';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_workspace_owner() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_update_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_level_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.prefixes_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: a_enrichment_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_enrichment_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_enrichment_queue OWNER TO postgres;

--
-- Name: a_google_maps_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_google_maps_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_google_maps_queue OWNER TO postgres;

--
-- Name: a_scraping_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_scraping_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_scraping_queue OWNER TO postgres;

--
-- Name: q_enrichment_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_enrichment_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_enrichment_queue OWNER TO postgres;

--
-- Name: q_enrichment_queue_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_enrichment_queue ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_enrichment_queue_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: q_google_maps_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_google_maps_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_google_maps_queue OWNER TO postgres;

--
-- Name: q_google_maps_queue_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_google_maps_queue ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_google_maps_queue_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: q_scraping_queue; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_scraping_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_scraping_queue OWNER TO postgres;

--
-- Name: q_scraping_queue_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_scraping_queue ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_scraping_queue_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    sequence integer NOT NULL,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    user_id uuid,
    user_name text,
    changes jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_log_action_type_check CHECK ((action_type = ANY (ARRAY['lead_created'::text, 'lead_updated'::text, 'lead_moved'::text, 'lead_deleted'::text, 'funnel_created'::text, 'funnel_updated'::text, 'funnel_deleted'::text, 'member_added'::text, 'member_removed'::text, 'workspace_updated'::text, 'conversation_created'::text, 'conversation_updated'::text]))),
    CONSTRAINT audit_log_entity_type_check CHECK ((entity_type = ANY (ARRAY['lead'::text, 'funnel'::text, 'workspace'::text, 'member'::text, 'conversation'::text])))
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_log IS 'Log de auditoria de todas as ações do sistema';


--
-- Name: COLUMN audit_log.sequence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_log.sequence IS 'Número sequencial para ordenação garantida';


--
-- Name: COLUMN audit_log.action_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_log.action_type IS 'Tipo de ação executada';


--
-- Name: COLUMN audit_log.changes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_log.changes IS 'Objeto JSON com as mudanças (before/after)';


--
-- Name: COLUMN audit_log.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_log.metadata IS 'Dados adicionais da ação';


--
-- Name: audit_log_sequence_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_sequence_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_sequence_seq OWNER TO postgres;

--
-- Name: audit_log_sequence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_sequence_seq OWNED BY public.audit_log.sequence;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    lead_id uuid,
    inbox_id uuid,
    assigned_to uuid,
    contact_name text NOT NULL,
    contact_phone text NOT NULL,
    avatar_url text,
    status text DEFAULT 'waiting'::text,
    channel text DEFAULT 'whatsapp'::text,
    last_message text,
    unread_count integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone DEFAULT now(),
    attendant_type text DEFAULT 'human'::text,
    CONSTRAINT conversations_attendant_type_check CHECK ((attendant_type = ANY (ARRAY['human'::text, 'ai'::text]))),
    CONSTRAINT conversations_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'chat'::text, 'instagram'::text, 'telegram'::text]))),
    CONSTRAINT conversations_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'in-progress'::text, 'resolved'::text])))
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: TABLE conversations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.conversations IS 'Conversas/atendimentos do sistema de chat';


--
-- Name: COLUMN conversations.lead_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conversations.lead_id IS 'Lead vinculado à conversa (opcional)';


--
-- Name: COLUMN conversations.assigned_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conversations.assigned_to IS 'Agente responsável pelo atendimento';


--
-- Name: COLUMN conversations.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conversations.status IS 'Status: waiting (aguardando), in-progress (em atendimento), resolved (resolvido)';


--
-- Name: COLUMN conversations.channel; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conversations.channel IS 'Canal de origem: whatsapp, email, chat, instagram, telegram';


--
-- Name: COLUMN conversations.last_message_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conversations.last_message_at IS 'Timestamp da última mensagem (para ordenação)';


--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    field_type text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb,
    is_required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT custom_fields_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'multi_select'::text, 'checkbox'::text, 'url'::text, 'email'::text, 'phone'::text])))
);


ALTER TABLE public.custom_fields OWNER TO postgres;

--
-- Name: TABLE custom_fields; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.custom_fields IS 'Definição de campos personalizados para leads';


--
-- Name: COLUMN custom_fields.field_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.custom_fields.field_type IS 'Tipo do campo: text, number, date, select, multi_select, checkbox, url, email, phone';


--
-- Name: COLUMN custom_fields.options; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.custom_fields.options IS 'Opções para campos select/multi_select (array de strings)';


--
-- Name: COLUMN custom_fields."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.custom_fields."position" IS 'Ordem de exibição no formulário';


--
-- Name: extraction_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.extraction_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    step_number integer NOT NULL,
    step_name text NOT NULL,
    level text NOT NULL,
    message text NOT NULL,
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT extraction_logs_level_check CHECK ((level = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'debug'::text]))),
    CONSTRAINT extraction_logs_step_number_check CHECK (((step_number >= 1) AND (step_number <= 9)))
);


ALTER TABLE public.extraction_logs OWNER TO postgres;

--
-- Name: TABLE extraction_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.extraction_logs IS 'Logs de extração de leads. Frontend precisa de SELECT para mostrar progresso em tempo real.';


--
-- Name: funnel_columns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.funnel_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    funnel_id uuid NOT NULL,
    title text NOT NULL,
    "position" integer NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.funnel_columns OWNER TO postgres;

--
-- Name: TABLE funnel_columns; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.funnel_columns IS 'Colunas/etapas dos funis (ex: Novo Lead, Contato, Proposta, Ganho)';


--
-- Name: COLUMN funnel_columns."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.funnel_columns."position" IS 'Ordem da coluna no funil (0, 1, 2...)';


--
-- Name: COLUMN funnel_columns.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.funnel_columns.color IS 'Cor opcional para identificação visual';


--
-- Name: funnels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.funnels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    "position" integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.funnels OWNER TO postgres;

--
-- Name: TABLE funnels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.funnels IS 'Funis de vendas / pipelines';


--
-- Name: COLUMN funnels.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.funnels.is_active IS 'Funis podem ser arquivados sem deletar';


--
-- Name: COLUMN funnels."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.funnels."position" IS 'Ordem de exibição na interface';


--
-- Name: inbox_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inbox_instances (
    inbox_id uuid NOT NULL,
    instance_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inbox_instances OWNER TO postgres;

--
-- Name: inboxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inboxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    auto_assignment boolean DEFAULT false,
    assigned_agents text[] DEFAULT ARRAY[]::text[],
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    working_hours jsonb DEFAULT '{"end": "18:00", "start": "08:00"}'::jsonb
);


ALTER TABLE public.inboxes OWNER TO postgres;

--
-- Name: instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    provider text DEFAULT 'whatsapp'::text,
    phone_number text,
    status text DEFAULT 'disconnected'::text,
    qr_code text,
    api_key text,
    webhook_url text,
    settings jsonb DEFAULT '{}'::jsonb,
    last_connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    provider_type character varying(50) DEFAULT 'z-api'::character varying,
    provider_config jsonb DEFAULT '{}'::jsonb,
    instance_token text,
    instance_id character varying(255),
    fallback_provider character varying(50),
    fallback_config jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT instances_provider_check CHECK ((provider = ANY (ARRAY['whatsapp'::text, 'instagram'::text, 'telegram'::text, 'evolution'::text, 'uazapi'::text]))),
    CONSTRAINT instances_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'connecting'::text, 'error'::text])))
);


ALTER TABLE public.instances OWNER TO postgres;

--
-- Name: COLUMN instances.provider; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.provider IS 'Tipo de provider: whatsapp, instagram, telegram, z-api, evolution';


--
-- Name: COLUMN instances.provider_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.provider_type IS 'Tipo do provider: z-api, evolution, waha, etc';


--
-- Name: COLUMN instances.provider_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.provider_config IS 'Configurações específicas do provider (endpoints, headers, etc)';


--
-- Name: COLUMN instances.instance_token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.instance_token IS 'Token específico da instância (diferente do api_key global)';


--
-- Name: COLUMN instances.instance_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.instance_id IS 'ID da instância no provider externo';


--
-- Name: COLUMN instances.fallback_provider; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.fallback_provider IS 'Provider de backup caso o principal falhe';


--
-- Name: COLUMN instances.fallback_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instances.fallback_config IS 'Configurações do provider de fallback';


--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    user_id uuid,
    activity_type text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_activities OWNER TO postgres;

--
-- Name: TABLE lead_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_activities IS 'Histórico de todas as atividades/interações com leads';


--
-- Name: COLUMN lead_activities.activity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_activities.activity_type IS 'Tipos: note, call, email, meeting, status_change, moved, created, updated';


--
-- Name: COLUMN lead_activities.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_activities.metadata IS 'Dados adicionais (ex: de qual coluna moveu, valores alterados)';


--
-- Name: lead_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_attachments OWNER TO postgres;

--
-- Name: TABLE lead_attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_attachments IS 'Arquivos anexados aos leads (contratos, propostas, etc)';


--
-- Name: COLUMN lead_attachments.file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_attachments.file_url IS 'URL do arquivo no Supabase Storage';


--
-- Name: COLUMN lead_attachments.file_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_attachments.file_size IS 'Tamanho em bytes';


--
-- Name: lead_custom_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_custom_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    custom_field_id uuid NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_custom_values OWNER TO postgres;

--
-- Name: TABLE lead_custom_values; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_custom_values IS 'Valores dos campos personalizados para cada lead';


--
-- Name: COLUMN lead_custom_values.value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_custom_values.value IS 'Valor armazenado como texto (converter conforme field_type)';


--
-- Name: lead_extraction_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_extraction_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    extraction_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    search_term text NOT NULL,
    location text NOT NULL,
    niche text,
    status text DEFAULT 'pending'::text NOT NULL,
    target_quantity integer NOT NULL,
    pages_consumed integer DEFAULT 0,
    found_quantity integer DEFAULT 0,
    created_quantity integer DEFAULT 0,
    duplicates_skipped integer DEFAULT 0,
    filtered_out integer DEFAULT 0,
    ai_decisions jsonb,
    filters_applied jsonb,
    credits_consumed integer DEFAULT 0,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    execution_time_ms integer,
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    current_step text,
    completed_steps integer DEFAULT 0,
    total_steps integer DEFAULT 9,
    progress_data jsonb,
    CONSTRAINT lead_extraction_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'partial'::text, 'failed'::text, 'cancelled'::text])))
);


ALTER TABLE public.lead_extraction_runs OWNER TO postgres;

--
-- Name: TABLE lead_extraction_runs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_extraction_runs IS 'Histórico de execuções de extração (cada vez que roda)';


--
-- Name: COLUMN lead_extraction_runs.pages_consumed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extraction_runs.pages_consumed IS 'Quantas páginas do SerpAPI foram consumidas nesta execução';


--
-- Name: COLUMN lead_extraction_runs.found_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extraction_runs.found_quantity IS 'Quantos leads o SerpAPI retornou';


--
-- Name: COLUMN lead_extraction_runs.created_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extraction_runs.created_quantity IS 'Quantos leads foram realmente criados no CRM';


--
-- Name: COLUMN lead_extraction_runs.duplicates_skipped; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extraction_runs.duplicates_skipped IS 'Quantos leads já existiam (duplicados)';


--
-- Name: COLUMN lead_extraction_runs.filtered_out; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extraction_runs.filtered_out IS 'Quantos leads não passaram nos filtros';


--
-- Name: lead_extractions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_extractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    extraction_name text NOT NULL,
    prompt text,
    niche text,
    search_term text NOT NULL,
    location text NOT NULL,
    target_quantity integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT false,
    schedule_time time without time zone,
    require_website boolean DEFAULT false,
    require_phone boolean DEFAULT false,
    require_email boolean DEFAULT false,
    min_reviews integer DEFAULT 0,
    min_rating numeric(2,1) DEFAULT 0.0,
    funnel_id uuid NOT NULL,
    column_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    extraction_mode text DEFAULT 'manual'::text NOT NULL,
    expand_state_search boolean DEFAULT false,
    CONSTRAINT lead_extractions_extraction_mode_check CHECK ((extraction_mode = ANY (ARRAY['ai'::text, 'manual'::text])))
);


ALTER TABLE public.lead_extractions OWNER TO postgres;

--
-- Name: TABLE lead_extractions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_extractions IS 'Configuração de extrações automáticas de leads do Google Maps';


--
-- Name: COLUMN lead_extractions.require_website; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.require_website IS 'true = só capturar leads COM website';


--
-- Name: COLUMN lead_extractions.require_phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.require_phone IS 'true = só capturar leads COM telefone';


--
-- Name: COLUMN lead_extractions.require_email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.require_email IS 'true = só capturar leads COM email';


--
-- Name: COLUMN lead_extractions.min_reviews; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.min_reviews IS 'Mínimo de avaliações necessárias (0 = sem filtro)';


--
-- Name: COLUMN lead_extractions.funnel_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.funnel_id IS 'Funil do CRM onde os leads serão migrados (obrigatório)';


--
-- Name: COLUMN lead_extractions.column_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.column_id IS 'Coluna do funil onde os leads serão criados (obrigatório)';


--
-- Name: COLUMN lead_extractions.extraction_mode; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.extraction_mode IS 'Tipo de extração: ai (baseada em ICP/Prompt) ou manual (baseada em termo de busca)';


--
-- Name: COLUMN lead_extractions.expand_state_search; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lead_extractions.expand_state_search IS 'Se true, expande busca para todo o estado quando não encontrar leads suficientes na cidade';


--
-- Name: lead_extraction_recent_runs; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.lead_extraction_recent_runs AS
 SELECT r.id,
    r.extraction_id,
    e.extraction_name,
    r.workspace_id,
    r.search_term,
    r.location,
    r.status,
    r.target_quantity,
    r.pages_consumed,
    r.found_quantity,
    r.created_quantity,
    r.duplicates_skipped,
    r.filtered_out,
    r.credits_consumed,
    r.started_at,
    r.finished_at,
    r.execution_time_ms,
    r.error_message,
    r.ai_decisions,
    r.created_at
   FROM (public.lead_extraction_runs r
     LEFT JOIN public.lead_extractions e ON ((e.id = r.extraction_id)))
  ORDER BY r.created_at DESC
 LIMIT 30;


ALTER VIEW public.lead_extraction_recent_runs OWNER TO postgres;

--
-- Name: lead_extraction_staging; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_extraction_staging (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    extraction_run_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    google_place_id text,
    deduplication_hash text NOT NULL,
    status_extraction text DEFAULT 'pending'::text NOT NULL,
    status_enrichment text DEFAULT 'pending'::text NOT NULL,
    client_name text NOT NULL,
    company text,
    extracted_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_google_data jsonb,
    raw_scraper_data jsonb,
    enrichment_data jsonb DEFAULT '{}'::jsonb,
    filter_results jsonb,
    filter_passed boolean DEFAULT false NOT NULL,
    filter_reason text,
    should_migrate boolean DEFAULT false NOT NULL,
    migrated_at timestamp without time zone,
    migrated_lead_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_extraction_staging_status_enrichment_check CHECK ((status_enrichment = ANY (ARRAY['pending'::text, 'enriching'::text, 'completed'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT lead_extraction_staging_status_extraction_check CHECK ((status_extraction = ANY (ARRAY['pending'::text, 'google_fetched'::text, 'scraping'::text, 'scraped'::text, 'filtered_out'::text, 'ready'::text])))
);


ALTER TABLE public.lead_extraction_staging OWNER TO postgres;

--
-- Name: TABLE lead_extraction_staging; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lead_extraction_staging IS 'Tabela temporária de staging para leads extraídos antes da migração final';


--
-- Name: lead_extractions_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.lead_extractions_stats AS
SELECT
    NULL::uuid AS id,
    NULL::text AS extraction_name,
    NULL::uuid AS workspace_id,
    NULL::boolean AS is_active,
    NULL::text AS search_term,
    NULL::text AS location,
    NULL::integer AS target_quantity,
    NULL::uuid AS funnel_id,
    NULL::bigint AS total_runs,
    NULL::bigint AS successful_runs,
    NULL::bigint AS failed_runs,
    NULL::bigint AS total_pages_consumed,
    NULL::bigint AS total_leads_created,
    NULL::bigint AS total_credits_consumed,
    NULL::timestamp without time zone AS last_run_at;


ALTER VIEW public.lead_extractions_stats OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    funnel_id uuid NOT NULL,
    column_id uuid,
    client_name text NOT NULL,
    company text,
    avatar_url text,
    deal_value numeric(15,2) DEFAULT 0,
    priority text,
    status text DEFAULT 'active'::text,
    contact_date timestamp with time zone,
    expected_close_date date,
    due_date date,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    "position" integer DEFAULT 0,
    is_important boolean DEFAULT false,
    assignee_name text,
    assignee_avatar text,
    comments_count integer DEFAULT 0,
    attachments_count integer DEFAULT 0,
    calls_count integer DEFAULT 0,
    emails_count integer DEFAULT 0,
    assigned_to uuid,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_activity_at timestamp with time zone DEFAULT now(),
    lead_extraction_id uuid,
    lead_extraction_run_id uuid,
    CONSTRAINT leads_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: TABLE leads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.leads IS 'Leads/negócios do CRM (cards do kanban)';


--
-- Name: COLUMN leads.deal_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.deal_value IS 'Valor estimado do negócio';


--
-- Name: COLUMN leads.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.status IS 'Status do lead (active, won, lost, archived)';


--
-- Name: COLUMN leads.due_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.due_date IS 'Data de vencimento/prazo';


--
-- Name: COLUMN leads.tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.tags IS 'Array de tags para categorização';


--
-- Name: COLUMN leads."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads."position" IS 'Posição do lead dentro da coluna (para ordenação drag-drop)';


--
-- Name: COLUMN leads.is_important; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.is_important IS 'Lead marcado como importante/destaque';


--
-- Name: COLUMN leads.assignee_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.assignee_name IS 'Nome do responsável (desnormalizado para performance)';


--
-- Name: COLUMN leads.assignee_avatar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.assignee_avatar IS 'Avatar do responsável (desnormalizado para performance)';


--
-- Name: COLUMN leads.assigned_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.assigned_to IS 'Usuário responsável pelo lead';


--
-- Name: COLUMN leads.last_activity_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.last_activity_at IS 'Última interação com o lead (para ordenação)';


--
-- Name: message_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid,
    provider_used character varying(50),
    action character varying(50),
    status character varying(20),
    request_data jsonb,
    response_data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.message_logs OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    content_type text DEFAULT 'text'::text,
    message_type text NOT NULL,
    text_content text,
    media_url text,
    audio_duration integer,
    file_name text,
    file_size integer,
    is_read boolean DEFAULT false,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    provider_message_id text,
    CONSTRAINT messages_content_type_check CHECK ((content_type = ANY (ARRAY['text'::text, 'image'::text, 'audio'::text, 'video'::text, 'document'::text]))),
    CONSTRAINT messages_message_type_check CHECK ((message_type = ANY (ARRAY['sent'::text, 'received'::text, 'delete'::text])))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.messages IS 'Mensagens trocadas nas conversas';


--
-- Name: COLUMN messages.content_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.content_type IS 'Tipo: text, image, audio, video, document';


--
-- Name: COLUMN messages.message_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.message_type IS 'sent (enviada) ou received (recebida)';


--
-- Name: COLUMN messages.audio_duration; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.audio_duration IS 'Duração do áudio em segundos';


--
-- Name: COLUMN messages.sent_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.sent_by IS 'Usuário que enviou (NULL se recebida do cliente)';


--
-- Name: COLUMN messages.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.deleted_at IS 'Timestamp quando a mensagem foi deletada (soft delete)';


--
-- Name: COLUMN messages.provider_message_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.provider_message_id IS 'ID original da mensagem fornecido pelo provider (WhatsApp/Evolution API). 
Usado para operações como deletar mensagens no WhatsApp.
Exemplo Evolution: "3EB0F8B8C892E1B40B0C"';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    last_workspace_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Tabela de usuários - RLS DESABILITADO (segurança gerenciada no backend)';


--
-- Name: COLUMN users.last_workspace_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.last_workspace_id IS 'Último workspace acessado pelo usuário';


--
-- Name: workspace_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspace_invites (
    code text NOT NULL,
    workspace_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    role text NOT NULL,
    used boolean DEFAULT false,
    used_by uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT workspace_invites_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text])))
);


ALTER TABLE public.workspace_invites OWNER TO postgres;

--
-- Name: TABLE workspace_invites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.workspace_invites IS 'Convites para usuários entrarem em workspaces';


--
-- Name: COLUMN workspace_invites.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspace_invites.code IS 'Código único do convite (UUID)';


--
-- Name: COLUMN workspace_invites.used; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspace_invites.used IS 'Se o convite já foi utilizado';


--
-- Name: COLUMN workspace_invites.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspace_invites.expires_at IS 'Data de expiração do convite';


--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text])))
);


ALTER TABLE public.workspace_members OWNER TO postgres;

--
-- Name: TABLE workspace_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.workspace_members IS 'Membros dos workspaces - RLS DESABILITADO (segurança gerenciada no backend)';


--
-- Name: COLUMN workspace_members.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspace_members.role IS 'owner: controle total | admin: gerenciar membros | member: usar CRM | viewer: apenas visualizar';


--
-- Name: COLUMN workspace_members.permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspace_members.permissions IS 'Array de permissões específicas (futuro)';


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workspaces OWNER TO postgres;

--
-- Name: TABLE workspaces; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.workspaces IS 'Workspaces - RLS DESABILITADO (segurança gerenciada no backend)';


--
-- Name: COLUMN workspaces.slug; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspaces.slug IS 'Identificador único URL-friendly';


--
-- Name: COLUMN workspaces.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workspaces.settings IS 'Configurações customizáveis do workspace';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2025_11_21; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_21 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_21 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_22; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_22 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_22 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_23; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_23 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_24; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_24 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_24 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_25; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_25 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_25 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_26; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_26 OWNER TO supabase_admin;

--
-- Name: messages_2025_11_27; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2025_11_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2025_11_27 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


ALTER TABLE supabase_migrations.seed_files OWNER TO postgres;

--
-- Name: messages_2025_11_21; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_21 FOR VALUES FROM ('2025-11-21 00:00:00') TO ('2025-11-22 00:00:00');


--
-- Name: messages_2025_11_22; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_22 FOR VALUES FROM ('2025-11-22 00:00:00') TO ('2025-11-23 00:00:00');


--
-- Name: messages_2025_11_23; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_23 FOR VALUES FROM ('2025-11-23 00:00:00') TO ('2025-11-24 00:00:00');


--
-- Name: messages_2025_11_24; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_24 FOR VALUES FROM ('2025-11-24 00:00:00') TO ('2025-11-25 00:00:00');


--
-- Name: messages_2025_11_25; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_25 FOR VALUES FROM ('2025-11-25 00:00:00') TO ('2025-11-26 00:00:00');


--
-- Name: messages_2025_11_26; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_26 FOR VALUES FROM ('2025-11-26 00:00:00') TO ('2025-11-27 00:00:00');


--
-- Name: messages_2025_11_27; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_27 FOR VALUES FROM ('2025-11-27 00:00:00') TO ('2025-11-28 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: audit_log sequence; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN sequence SET DEFAULT nextval('public.audit_log_sequence_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: a_enrichment_queue a_enrichment_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_enrichment_queue
    ADD CONSTRAINT a_enrichment_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: a_google_maps_queue a_google_maps_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_google_maps_queue
    ADD CONSTRAINT a_google_maps_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: a_scraping_queue a_scraping_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_scraping_queue
    ADD CONSTRAINT a_scraping_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: q_enrichment_queue q_enrichment_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_enrichment_queue
    ADD CONSTRAINT q_enrichment_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: q_google_maps_queue q_google_maps_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_google_maps_queue
    ADD CONSTRAINT q_google_maps_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: q_scraping_queue q_scraping_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_scraping_queue
    ADD CONSTRAINT q_scraping_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_workspace_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_workspace_id_name_key UNIQUE (workspace_id, name);


--
-- Name: extraction_logs extraction_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.extraction_logs
    ADD CONSTRAINT extraction_logs_pkey PRIMARY KEY (id);


--
-- Name: funnel_columns funnel_columns_funnel_id_position_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnel_columns
    ADD CONSTRAINT funnel_columns_funnel_id_position_key UNIQUE (funnel_id, "position");


--
-- Name: funnel_columns funnel_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnel_columns
    ADD CONSTRAINT funnel_columns_pkey PRIMARY KEY (id);


--
-- Name: funnels funnels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnels
    ADD CONSTRAINT funnels_pkey PRIMARY KEY (id);


--
-- Name: inbox_instances inbox_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbox_instances
    ADD CONSTRAINT inbox_instances_pkey PRIMARY KEY (inbox_id, instance_id);


--
-- Name: inboxes inboxes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inboxes
    ADD CONSTRAINT inboxes_pkey PRIMARY KEY (id);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_attachments lead_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_pkey PRIMARY KEY (id);


--
-- Name: lead_custom_values lead_custom_values_lead_id_custom_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_custom_values
    ADD CONSTRAINT lead_custom_values_lead_id_custom_field_id_key UNIQUE (lead_id, custom_field_id);


--
-- Name: lead_custom_values lead_custom_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_custom_values
    ADD CONSTRAINT lead_custom_values_pkey PRIMARY KEY (id);


--
-- Name: lead_extraction_runs lead_extraction_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_runs
    ADD CONSTRAINT lead_extraction_runs_pkey PRIMARY KEY (id);


--
-- Name: lead_extraction_staging lead_extraction_staging_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_staging
    ADD CONSTRAINT lead_extraction_staging_pkey PRIMARY KEY (id);


--
-- Name: lead_extractions lead_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extractions
    ADD CONSTRAINT lead_extractions_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: message_logs message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: lead_extraction_staging unique_deduplication_per_workspace; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_staging
    ADD CONSTRAINT unique_deduplication_per_workspace UNIQUE (workspace_id, deduplication_hash);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workspace_invites workspace_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_invites
    ADD CONSTRAINT workspace_invites_pkey PRIMARY KEY (code);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_21 messages_2025_11_21_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_21
    ADD CONSTRAINT messages_2025_11_21_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_22 messages_2025_11_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_22
    ADD CONSTRAINT messages_2025_11_22_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_23 messages_2025_11_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_23
    ADD CONSTRAINT messages_2025_11_23_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_24 messages_2025_11_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_24
    ADD CONSTRAINT messages_2025_11_24_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_25 messages_2025_11_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_25
    ADD CONSTRAINT messages_2025_11_25_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_26 messages_2025_11_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_26
    ADD CONSTRAINT messages_2025_11_26_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_27 messages_2025_11_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2025_11_27
    ADD CONSTRAINT messages_2025_11_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: archived_at_idx_enrichment_queue; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_enrichment_queue ON pgmq.a_enrichment_queue USING btree (archived_at);


--
-- Name: archived_at_idx_google_maps_queue; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_google_maps_queue ON pgmq.a_google_maps_queue USING btree (archived_at);


--
-- Name: archived_at_idx_scraping_queue; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_scraping_queue ON pgmq.a_scraping_queue USING btree (archived_at);


--
-- Name: q_enrichment_queue_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_enrichment_queue_vt_idx ON pgmq.q_enrichment_queue USING btree (vt);


--
-- Name: q_google_maps_queue_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_google_maps_queue_vt_idx ON pgmq.q_google_maps_queue USING btree (vt);


--
-- Name: q_scraping_queue_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_scraping_queue_vt_idx ON pgmq.q_scraping_queue USING btree (vt);


--
-- Name: idx_activities_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_created ON public.lead_activities USING btree (created_at DESC);


--
-- Name: idx_activities_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_lead ON public.lead_activities USING btree (lead_id);


--
-- Name: idx_activities_lead_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_lead_created ON public.lead_activities USING btree (lead_id, created_at DESC);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type ON public.lead_activities USING btree (activity_type);


--
-- Name: idx_activities_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_user ON public.lead_activities USING btree (user_id);


--
-- Name: idx_attachments_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_lead ON public.lead_attachments USING btree (lead_id);


--
-- Name: idx_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_uploaded_by ON public.lead_attachments USING btree (uploaded_by);


--
-- Name: idx_audit_log_action_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_action_type ON public.audit_log USING btree (workspace_id, action_type);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (workspace_id, created_at DESC);


--
-- Name: idx_audit_log_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_entity_type ON public.audit_log USING btree (workspace_id, entity_type);


--
-- Name: idx_audit_log_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_sequence ON public.audit_log USING btree (workspace_id, sequence);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (workspace_id, user_id);


--
-- Name: idx_audit_log_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_workspace ON public.audit_log USING btree (workspace_id);


--
-- Name: idx_audit_log_workspace_sequence_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_workspace_sequence_desc ON public.audit_log USING btree (workspace_id, sequence DESC);


--
-- Name: INDEX idx_audit_log_workspace_sequence_desc; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_audit_log_workspace_sequence_desc IS 'Índice composto para buscar últimos eventos de auditoria';


--
-- Name: idx_columns_funnel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_columns_funnel ON public.funnel_columns USING btree (funnel_id);


--
-- Name: idx_columns_funnel_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_columns_funnel_position ON public.funnel_columns USING btree (funnel_id, "position");


--
-- Name: idx_conversations_agent_in_progress; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_agent_in_progress ON public.conversations USING btree (assigned_to, last_message_at DESC) WHERE (status = 'in-progress'::text);


--
-- Name: INDEX idx_conversations_agent_in_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_conversations_agent_in_progress IS 'Índice para conversas em andamento de um agente específico';


--
-- Name: idx_conversations_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_assigned ON public.conversations USING btree (assigned_to);


--
-- Name: idx_conversations_attendant_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_attendant_type ON public.conversations USING btree (attendant_type);


--
-- Name: idx_conversations_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_channel ON public.conversations USING btree (channel);


--
-- Name: idx_conversations_inbox; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_inbox ON public.conversations USING btree (inbox_id);


--
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC);


--
-- Name: idx_conversations_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_lead ON public.conversations USING btree (lead_id);


--
-- Name: idx_conversations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status);


--
-- Name: idx_conversations_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_tags ON public.conversations USING gin (tags);


--
-- Name: idx_conversations_waiting_unassigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_waiting_unassigned ON public.conversations USING btree (workspace_id, last_message_at DESC) WHERE ((status = 'waiting'::text) AND (assigned_to IS NULL));


--
-- Name: INDEX idx_conversations_waiting_unassigned; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_conversations_waiting_unassigned IS 'Índice parcial para conversas aguardando atendimento (query crítica do chat)';


--
-- Name: idx_conversations_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_workspace ON public.conversations USING btree (workspace_id);


--
-- Name: idx_custom_fields_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_fields_position ON public.custom_fields USING btree (workspace_id, "position");


--
-- Name: idx_custom_fields_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_fields_workspace ON public.custom_fields USING btree (workspace_id);


--
-- Name: idx_extraction_logs_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_extraction_logs_level ON public.extraction_logs USING btree (level) WHERE (level = ANY (ARRAY['error'::text, 'warning'::text]));


--
-- Name: idx_extraction_logs_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_extraction_logs_run ON public.extraction_logs USING btree (run_id, created_at DESC);


--
-- Name: idx_extraction_logs_step; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_extraction_logs_step ON public.extraction_logs USING btree (step_number);


--
-- Name: idx_extractions_funnel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_extractions_funnel ON public.lead_extractions USING btree (funnel_id);


--
-- Name: idx_funnels_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_funnels_created_by ON public.funnels USING btree (created_by);


--
-- Name: idx_funnels_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_funnels_workspace ON public.funnels USING btree (workspace_id);


--
-- Name: idx_funnels_workspace_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_funnels_workspace_active ON public.funnels USING btree (workspace_id, is_active);


--
-- Name: idx_inbox_instances_inbox; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inbox_instances_inbox ON public.inbox_instances USING btree (inbox_id);


--
-- Name: idx_inbox_instances_instance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inbox_instances_instance ON public.inbox_instances USING btree (instance_id);


--
-- Name: idx_inboxes_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inboxes_workspace ON public.inboxes USING btree (workspace_id);


--
-- Name: idx_instances_provider_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instances_provider_type ON public.instances USING btree (provider_type);


--
-- Name: idx_instances_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instances_status ON public.instances USING btree (workspace_id, status);


--
-- Name: idx_instances_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instances_workspace ON public.instances USING btree (workspace_id);


--
-- Name: idx_invites_used_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invites_used_by ON public.workspace_invites USING btree (used_by);


--
-- Name: idx_lead_custom_values_field; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_custom_values_field ON public.lead_custom_values USING btree (custom_field_id);


--
-- Name: idx_lead_custom_values_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_custom_values_lead ON public.lead_custom_values USING btree (lead_id);


--
-- Name: idx_lead_extraction_runs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extraction_runs_created ON public.lead_extraction_runs USING btree (created_at DESC);


--
-- Name: idx_lead_extraction_runs_extraction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extraction_runs_extraction ON public.lead_extraction_runs USING btree (extraction_id);


--
-- Name: idx_lead_extraction_runs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extraction_runs_status ON public.lead_extraction_runs USING btree (status);


--
-- Name: idx_lead_extraction_runs_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extraction_runs_workspace ON public.lead_extraction_runs USING btree (workspace_id);


--
-- Name: idx_lead_extractions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extractions_active ON public.lead_extractions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_lead_extractions_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extractions_mode ON public.lead_extractions USING btree (extraction_mode);


--
-- Name: idx_lead_extractions_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_extractions_workspace ON public.lead_extractions USING btree (workspace_id);


--
-- Name: idx_leads_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_assigned ON public.leads USING btree (assigned_to);


--
-- Name: idx_leads_client_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_client_name ON public.leads USING btree (client_name);


--
-- Name: idx_leads_column; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_column ON public.leads USING btree (column_id);


--
-- Name: idx_leads_column_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_column_position ON public.leads USING btree (column_id, "position");


--
-- Name: idx_leads_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_company ON public.leads USING btree (company);


--
-- Name: idx_leads_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_created_by ON public.leads USING btree (created_by);


--
-- Name: idx_leads_funnel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_funnel ON public.leads USING btree (funnel_id);


--
-- Name: idx_leads_important; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_important ON public.leads USING btree (workspace_id, is_important, last_activity_at DESC) WHERE (is_important = true);


--
-- Name: INDEX idx_leads_important; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_leads_important IS 'Índice parcial para leads marcados como importantes';


--
-- Name: idx_leads_last_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_last_activity ON public.leads USING btree (last_activity_at DESC);


--
-- Name: idx_leads_lead_extraction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_lead_extraction ON public.leads USING btree (lead_extraction_id);


--
-- Name: idx_leads_lead_extraction_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_lead_extraction_run ON public.leads USING btree (lead_extraction_run_id);


--
-- Name: idx_leads_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_priority ON public.leads USING btree (priority);


--
-- Name: idx_leads_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_search ON public.leads USING gin (to_tsvector('portuguese'::regconfig, ((((COALESCE(client_name, ''::text) || ' '::text) || COALESCE(company, ''::text)) || ' '::text) || COALESCE(notes, ''::text))));


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_leads_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_tags ON public.leads USING gin (tags);


--
-- Name: idx_leads_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_updated_by ON public.leads USING btree (updated_by);


--
-- Name: idx_leads_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_workspace ON public.leads USING btree (workspace_id);


--
-- Name: idx_leads_workspace_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_workspace_active ON public.leads USING btree (workspace_id, status) WHERE (status = 'active'::text);


--
-- Name: INDEX idx_leads_workspace_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_leads_workspace_active IS 'Índice parcial para leads ativos (filtro mais comum)';


--
-- Name: idx_leads_workspace_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_workspace_priority ON public.leads USING btree (workspace_id, priority, status) WHERE (status = 'active'::text);


--
-- Name: INDEX idx_leads_workspace_priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_leads_workspace_priority IS 'Índice para estatísticas por prioridade';


--
-- Name: idx_leads_workspace_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_workspace_value ON public.leads USING btree (workspace_id, deal_value) WHERE ((status = 'active'::text) AND (deal_value > (0)::numeric));


--
-- Name: INDEX idx_leads_workspace_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_leads_workspace_value IS 'Índice para cálculos de valor total de leads ativos';


--
-- Name: idx_members_invited_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_invited_by ON public.workspace_members USING btree (invited_by);


--
-- Name: idx_members_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_role ON public.workspace_members USING btree (workspace_id, role);


--
-- Name: idx_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_user ON public.workspace_members USING btree (user_id);


--
-- Name: idx_members_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_workspace ON public.workspace_members USING btree (workspace_id);


--
-- Name: idx_message_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_logs_created_at ON public.message_logs USING btree (created_at DESC);


--
-- Name: idx_message_logs_instance_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_logs_instance_id ON public.message_logs USING btree (instance_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at);


--
-- Name: INDEX idx_messages_conversation_created; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_messages_conversation_created IS 'Índice composto para paginação de mensagens (ordenação ASC para exibir cronológica)';


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_deleted_at ON public.messages USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_messages_provider_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_provider_message_id ON public.messages USING btree (provider_message_id);


--
-- Name: idx_messages_sent_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sent_by ON public.messages USING btree (sent_by);


--
-- Name: idx_runs_progress; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_runs_progress ON public.lead_extraction_runs USING btree (status, completed_steps);


--
-- Name: idx_staging_dedup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_dedup ON public.lead_extraction_staging USING btree (deduplication_hash);


--
-- Name: idx_staging_dedup_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_dedup_hash ON public.lead_extraction_staging USING btree (workspace_id, deduplication_hash);


--
-- Name: idx_staging_google_place; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_google_place ON public.lead_extraction_staging USING btree (google_place_id);


--
-- Name: idx_staging_migrated_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_migrated_lead ON public.lead_extraction_staging USING btree (migrated_lead_id);


--
-- Name: idx_staging_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_run ON public.lead_extraction_staging USING btree (extraction_run_id);


--
-- Name: idx_staging_should_migrate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_should_migrate ON public.lead_extraction_staging USING btree (should_migrate, migrated_at) WHERE ((should_migrate = true) AND (migrated_at IS NULL));


--
-- Name: idx_staging_status_enrichment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_status_enrichment ON public.lead_extraction_staging USING btree (status_enrichment) WHERE (status_enrichment = 'pending'::text);


--
-- Name: idx_staging_status_extraction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_status_extraction ON public.lead_extraction_staging USING btree (status_extraction);


--
-- Name: idx_staging_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staging_workspace ON public.lead_extraction_staging USING btree (workspace_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_id ON public.users USING btree (id);


--
-- Name: idx_users_last_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_workspace ON public.users USING btree (last_workspace_id);


--
-- Name: idx_workspace_invites_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_created_at ON public.workspace_invites USING btree (created_at DESC);


--
-- Name: idx_workspace_invites_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_expires_at ON public.workspace_invites USING btree (expires_at DESC);


--
-- Name: idx_workspace_invites_invited_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_invited_by ON public.workspace_invites USING btree (invited_by);


--
-- Name: idx_workspace_invites_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_role ON public.workspace_invites USING btree (workspace_id, role);


--
-- Name: idx_workspace_invites_used; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_used ON public.workspace_invites USING btree (workspace_id, used);


--
-- Name: idx_workspace_invites_used_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_used_by ON public.workspace_invites USING btree (workspace_id, used_by);


--
-- Name: idx_workspace_invites_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_invites_workspace ON public.workspace_invites USING btree (workspace_id);


--
-- Name: idx_workspace_members_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspace_members_composite ON public.workspace_members USING btree (workspace_id, user_id);


--
-- Name: idx_workspaces_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspaces_id ON public.workspaces USING btree (id);


--
-- Name: idx_workspaces_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspaces_owner ON public.workspaces USING btree (owner_id);


--
-- Name: idx_workspaces_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workspaces_slug ON public.workspaces USING btree (slug);


--
-- Name: unique_funnel_column_title; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_funnel_column_title ON public.funnel_columns USING btree (funnel_id, lower(title));


--
-- Name: INDEX unique_funnel_column_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.unique_funnel_column_title IS 'Garante que não existam colunas com mesmo título no funil (case-insensitive)';


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_21_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_21_inserted_at_topic_idx ON realtime.messages_2025_11_21 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_22_inserted_at_topic_idx ON realtime.messages_2025_11_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_23_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_23_inserted_at_topic_idx ON realtime.messages_2025_11_23 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_24_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_24_inserted_at_topic_idx ON realtime.messages_2025_11_24 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_25_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_25_inserted_at_topic_idx ON realtime.messages_2025_11_25 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_26_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_26_inserted_at_topic_idx ON realtime.messages_2025_11_26 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2025_11_27_inserted_at_topic_idx ON realtime.messages_2025_11_27 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2025_11_21_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_21_inserted_at_topic_idx;


--
-- Name: messages_2025_11_21_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_21_pkey;


--
-- Name: messages_2025_11_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_22_inserted_at_topic_idx;


--
-- Name: messages_2025_11_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_22_pkey;


--
-- Name: messages_2025_11_23_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_23_inserted_at_topic_idx;


--
-- Name: messages_2025_11_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_23_pkey;


--
-- Name: messages_2025_11_24_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_24_inserted_at_topic_idx;


--
-- Name: messages_2025_11_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_24_pkey;


--
-- Name: messages_2025_11_25_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_25_inserted_at_topic_idx;


--
-- Name: messages_2025_11_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_25_pkey;


--
-- Name: messages_2025_11_26_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_26_inserted_at_topic_idx;


--
-- Name: messages_2025_11_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_26_pkey;


--
-- Name: messages_2025_11_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_27_inserted_at_topic_idx;


--
-- Name: messages_2025_11_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_27_pkey;


--
-- Name: lead_extractions_stats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.lead_extractions_stats AS
 SELECT e.id,
    e.extraction_name,
    e.workspace_id,
    e.is_active,
    e.search_term,
    e.location,
    e.target_quantity,
    e.funnel_id,
    count(r.id) AS total_runs,
    sum(
        CASE
            WHEN (r.status = 'completed'::text) THEN 1
            ELSE 0
        END) AS successful_runs,
    sum(
        CASE
            WHEN (r.status = 'failed'::text) THEN 1
            ELSE 0
        END) AS failed_runs,
    sum(r.pages_consumed) AS total_pages_consumed,
    sum(r.created_quantity) AS total_leads_created,
    sum(r.credits_consumed) AS total_credits_consumed,
    max(r.created_at) AS last_run_at
   FROM (public.lead_extractions e
     LEFT JOIN public.lead_extraction_runs r ON ((r.extraction_id = e.id)))
  GROUP BY e.id;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: workspace_members delete_orphan_workspace_on_member_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER delete_orphan_workspace_on_member_delete AFTER DELETE ON public.workspace_members FOR EACH ROW WHEN ((old.role = 'owner'::text)) EXECUTE FUNCTION public.delete_orphan_workspaces();


--
-- Name: workspaces generate_slug_on_workspace_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER generate_slug_on_workspace_insert BEFORE INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.auto_generate_workspace_slug();


--
-- Name: lead_activities on_lead_activity_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_lead_activity_created AFTER INSERT ON public.lead_activities FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_activity();


--
-- Name: leads on_lead_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_lead_created AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_creation();


--
-- Name: leads on_lead_moved; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_lead_moved AFTER UPDATE ON public.leads FOR EACH ROW WHEN ((old.column_id IS DISTINCT FROM new.column_id)) EXECUTE FUNCTION public.log_lead_move();


--
-- Name: leads reorder_on_lead_moved; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER reorder_on_lead_moved AFTER UPDATE ON public.leads FOR EACH ROW WHEN (((old.column_id IS DISTINCT FROM new.column_id) OR (old."position" IS DISTINCT FROM new."position"))) EXECUTE FUNCTION public.reorder_leads_in_column();


--
-- Name: leads trigger_create_custom_fields; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_create_custom_fields AFTER INSERT ON public.leads FOR EACH ROW WHEN ((new.lead_extraction_run_id IS NOT NULL)) EXECUTE FUNCTION public.create_custom_fields_from_staging();


--
-- Name: lead_extraction_staging trigger_staging_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_staging_updated_at BEFORE UPDATE ON public.lead_extraction_staging FOR EACH ROW EXECUTE FUNCTION public.update_staging_updated_at();


--
-- Name: lead_extractions trigger_update_lead_extraction_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_lead_extraction_updated_at BEFORE UPDATE ON public.lead_extractions FOR EACH ROW EXECUTE FUNCTION public.update_lead_extraction_updated_at();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_fields update_custom_fields_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON public.custom_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: funnel_columns update_funnel_columns_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_funnel_columns_updated_at BEFORE UPDATE ON public.funnel_columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: funnels update_funnels_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inboxes update_inboxes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inboxes_updated_at BEFORE UPDATE ON public.inboxes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: instances update_instances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON public.instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_custom_values update_lead_custom_values_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_lead_custom_values_updated_at BEFORE UPDATE ON public.lead_custom_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_invites update_workspace_invites_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workspace_invites_updated_at BEFORE UPDATE ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_members validate_owner_on_member_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_owner_on_member_update BEFORE UPDATE ON public.workspace_members FOR EACH ROW WHEN (((old.role = 'owner'::text) AND (new.role <> 'owner'::text))) EXECUTE FUNCTION public.validate_workspace_owner();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: custom_fields custom_fields_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: extraction_logs extraction_logs_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.extraction_logs
    ADD CONSTRAINT extraction_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.lead_extraction_runs(id) ON DELETE CASCADE;


--
-- Name: users fk_users_last_workspace; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_last_workspace FOREIGN KEY (last_workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;


--
-- Name: funnel_columns funnel_columns_funnel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnel_columns
    ADD CONSTRAINT funnel_columns_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE CASCADE;


--
-- Name: funnels funnels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnels
    ADD CONSTRAINT funnels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: funnels funnels_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funnels
    ADD CONSTRAINT funnels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: inbox_instances inbox_instances_inbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbox_instances
    ADD CONSTRAINT inbox_instances_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.inboxes(id) ON DELETE CASCADE;


--
-- Name: inbox_instances inbox_instances_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbox_instances
    ADD CONSTRAINT inbox_instances_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_attachments lead_attachments_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_attachments lead_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_custom_values lead_custom_values_custom_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_custom_values
    ADD CONSTRAINT lead_custom_values_custom_field_id_fkey FOREIGN KEY (custom_field_id) REFERENCES public.custom_fields(id) ON DELETE CASCADE;


--
-- Name: lead_custom_values lead_custom_values_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_custom_values
    ADD CONSTRAINT lead_custom_values_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_extraction_runs lead_extraction_runs_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_runs
    ADD CONSTRAINT lead_extraction_runs_extraction_id_fkey FOREIGN KEY (extraction_id) REFERENCES public.lead_extractions(id) ON DELETE CASCADE;


--
-- Name: lead_extraction_runs lead_extraction_runs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_runs
    ADD CONSTRAINT lead_extraction_runs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: lead_extraction_staging lead_extraction_staging_extraction_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_staging
    ADD CONSTRAINT lead_extraction_staging_extraction_run_id_fkey FOREIGN KEY (extraction_run_id) REFERENCES public.lead_extraction_runs(id) ON DELETE CASCADE;


--
-- Name: lead_extraction_staging lead_extraction_staging_migrated_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_staging
    ADD CONSTRAINT lead_extraction_staging_migrated_lead_id_fkey FOREIGN KEY (migrated_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: lead_extraction_staging lead_extraction_staging_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extraction_staging
    ADD CONSTRAINT lead_extraction_staging_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: lead_extractions lead_extractions_funnel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extractions
    ADD CONSTRAINT lead_extractions_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE SET NULL;


--
-- Name: lead_extractions lead_extractions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_extractions
    ADD CONSTRAINT lead_extractions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.funnel_columns(id) ON DELETE SET NULL;


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_funnel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE CASCADE;


--
-- Name: leads leads_lead_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_extraction_id_fkey FOREIGN KEY (lead_extraction_id) REFERENCES public.lead_extractions(id) ON DELETE SET NULL;


--
-- Name: leads leads_lead_extraction_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_extraction_run_id_fkey FOREIGN KEY (lead_extraction_run_id) REFERENCES public.lead_extraction_runs(id) ON DELETE SET NULL;


--
-- Name: leads leads_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: leads leads_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: message_logs message_logs_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workspace_invites workspace_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_invites
    ADD CONSTRAINT workspace_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_invites workspace_invites_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_invites
    ADD CONSTRAINT workspace_invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workspace_invites workspace_invites_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_invites
    ADD CONSTRAINT workspace_invites_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages Allow service_role full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow service_role full access" ON public.messages TO service_role USING (true) WITH CHECK (true);


--
-- Name: extraction_logs Service role bypass RLS; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role bypass RLS" ON public.extraction_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_extraction_runs Service role bypass RLS; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role bypass RLS" ON public.lead_extraction_runs TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_extraction_staging Service role bypass RLS; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role bypass RLS" ON public.lead_extraction_staging TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_extractions Service role bypass RLS; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role bypass RLS" ON public.lead_extractions TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_extraction_staging Service role can delete staging leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can delete staging leads" ON public.lead_extraction_staging FOR DELETE USING (true);


--
-- Name: lead_extraction_staging Service role can insert staging leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert staging leads" ON public.lead_extraction_staging FOR INSERT WITH CHECK (true);


--
-- Name: lead_extraction_staging Service role can update staging leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can update staging leads" ON public.lead_extraction_staging FOR UPDATE USING (true);


--
-- Name: extraction_logs Users can view extraction logs from their workspace; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view extraction logs from their workspace" ON public.extraction_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lead_extraction_runs ler
  WHERE ((ler.id = extraction_logs.run_id) AND (EXISTS ( SELECT 1
           FROM public.workspace_members wm
          WHERE ((wm.workspace_id = ler.workspace_id) AND (wm.user_id = auth.uid()))))))));


--
-- Name: POLICY "Users can view extraction logs from their workspace" ON extraction_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view extraction logs from their workspace" ON public.extraction_logs IS 'Permite que usuários vejam apenas logs de extrações do seu workspace';


--
-- Name: lead_extraction_staging Users can view staging leads from their workspace; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view staging leads from their workspace" ON public.lead_extraction_staging FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = lead_extraction_staging.workspace_id) AND (wm.user_id = auth.uid())))));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_extractions extraction_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_delete_policy ON public.lead_extractions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extractions.workspace_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: lead_extractions extraction_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_insert_policy ON public.lead_extractions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extractions.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_extraction_runs extraction_runs_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_runs_delete_policy ON public.lead_extraction_runs FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extraction_runs.workspace_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.role = 'owner'::text)))));


--
-- Name: lead_extraction_runs extraction_runs_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_runs_insert_policy ON public.lead_extraction_runs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extraction_runs.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_extraction_runs extraction_runs_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_runs_select_policy ON public.lead_extraction_runs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extraction_runs.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_extraction_runs extraction_runs_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_runs_update_policy ON public.lead_extraction_runs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extraction_runs.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_extractions extraction_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_select_policy ON public.lead_extractions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extractions.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_extractions extraction_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY extraction_update_policy ON public.lead_extractions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extractions.workspace_id) AND (workspace_members.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_id = lead_extractions.workspace_id) AND (workspace_members.user_id = auth.uid())))));


--
-- Name: lead_attachments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_extraction_staging; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_extraction_staging ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations service_role_all_conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_all_conversations ON public.conversations TO service_role USING (true) WITH CHECK (true);


--
-- Name: messages service_role_all_messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_all_messages ON public.messages TO service_role USING (true) WITH CHECK (true);


--
-- Name: inbox_instances service_role_select_inbox_instances; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_select_inbox_instances ON public.inbox_instances FOR SELECT TO service_role USING (true);


--
-- Name: instances service_role_select_instances; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_select_instances ON public.instances FOR SELECT TO service_role USING (true);


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime conversations; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversations;


--
-- Name: supabase_realtime leads; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.leads;


--
-- Name: supabase_realtime messages; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.messages;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA cron; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA cron TO postgres WITH GRANT OPTION;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;


--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA pgmq; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT USAGE ON SCHEMA pgmq TO anon;
GRANT USAGE ON SCHEMA pgmq TO authenticated;


--
-- Name: SCHEMA pgmq_public; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA pgmq_public TO anon;
GRANT USAGE ON SCHEMA pgmq_public TO authenticated;
GRANT USAGE ON SCHEMA pgmq_public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA vault TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION job_cache_invalidate(); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.job_cache_invalidate() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(job_name text, schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(job_name text, schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_id bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_id bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_name text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION _belongs_to_pgmq(table_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._belongs_to_pgmq(table_name text) TO service_role;


--
-- Name: FUNCTION _ensure_pg_partman_installed(); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._ensure_pg_partman_installed() TO service_role;


--
-- Name: FUNCTION _extension_exists(extension_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._extension_exists(extension_name text) TO service_role;


--
-- Name: FUNCTION _get_partition_col(partition_interval text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._get_partition_col(partition_interval text) TO service_role;


--
-- Name: FUNCTION _get_pg_partman_major_version(); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._get_pg_partman_major_version() TO service_role;


--
-- Name: FUNCTION _get_pg_partman_schema(); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq._get_pg_partman_schema() TO service_role;


--
-- Name: FUNCTION archive(queue_name text, msg_ids bigint[]); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.archive(queue_name text, msg_ids bigint[]) TO service_role;


--
-- Name: FUNCTION archive(queue_name text, msg_id bigint); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.archive(queue_name text, msg_id bigint) TO service_role;
GRANT ALL ON FUNCTION pgmq.archive(queue_name text, msg_id bigint) TO anon;
GRANT ALL ON FUNCTION pgmq.archive(queue_name text, msg_id bigint) TO authenticated;


--
-- Name: FUNCTION convert_archive_partitioned(table_name text, partition_interval text, retention_interval text, leading_partition integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.convert_archive_partitioned(table_name text, partition_interval text, retention_interval text, leading_partition integer) TO service_role;


--
-- Name: FUNCTION "create"(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq."create"(queue_name text) TO service_role;


--
-- Name: FUNCTION create_non_partitioned(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.create_non_partitioned(queue_name text) TO service_role;


--
-- Name: FUNCTION create_partitioned(queue_name text, partition_interval text, retention_interval text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.create_partitioned(queue_name text, partition_interval text, retention_interval text) TO service_role;


--
-- Name: FUNCTION create_unlogged(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.create_unlogged(queue_name text) TO service_role;


--
-- Name: FUNCTION delete(queue_name text, msg_ids bigint[]); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.delete(queue_name text, msg_ids bigint[]) TO service_role;


--
-- Name: FUNCTION delete(queue_name text, msg_id bigint); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.delete(queue_name text, msg_id bigint) TO service_role;
GRANT ALL ON FUNCTION pgmq.delete(queue_name text, msg_id bigint) TO anon;
GRANT ALL ON FUNCTION pgmq.delete(queue_name text, msg_id bigint) TO authenticated;


--
-- Name: FUNCTION detach_archive(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.detach_archive(queue_name text) TO service_role;


--
-- Name: FUNCTION drop_queue(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.drop_queue(queue_name text) TO service_role;


--
-- Name: FUNCTION drop_queue(queue_name text, partitioned boolean); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.drop_queue(queue_name text, partitioned boolean) TO service_role;


--
-- Name: FUNCTION format_table_name(queue_name text, prefix text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.format_table_name(queue_name text, prefix text) TO service_role;


--
-- Name: FUNCTION list_queues(); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.list_queues() TO service_role;


--
-- Name: FUNCTION metrics(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.metrics(queue_name text) TO service_role;


--
-- Name: FUNCTION metrics_all(); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.metrics_all() TO service_role;


--
-- Name: FUNCTION pop(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.pop(queue_name text) TO service_role;
GRANT ALL ON FUNCTION pgmq.pop(queue_name text) TO anon;
GRANT ALL ON FUNCTION pgmq.pop(queue_name text) TO authenticated;


--
-- Name: FUNCTION purge_queue(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.purge_queue(queue_name text) TO service_role;


--
-- Name: FUNCTION read(queue_name text, vt integer, qty integer, conditional jsonb); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.read(queue_name text, vt integer, qty integer, conditional jsonb) TO service_role;
GRANT ALL ON FUNCTION pgmq.read(queue_name text, vt integer, qty integer, conditional jsonb) TO anon;
GRANT ALL ON FUNCTION pgmq.read(queue_name text, vt integer, qty integer, conditional jsonb) TO authenticated;


--
-- Name: FUNCTION read_with_poll(queue_name text, vt integer, qty integer, max_poll_seconds integer, poll_interval_ms integer, conditional jsonb); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.read_with_poll(queue_name text, vt integer, qty integer, max_poll_seconds integer, poll_interval_ms integer, conditional jsonb) TO service_role;


--
-- Name: FUNCTION send(queue_name text, msg jsonb); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb) TO service_role;


--
-- Name: FUNCTION send(queue_name text, msg jsonb, delay integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, delay integer) TO service_role;
GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, delay integer) TO anon;
GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, delay integer) TO authenticated;


--
-- Name: FUNCTION send(queue_name text, msg jsonb, headers jsonb); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, headers jsonb) TO service_role;


--
-- Name: FUNCTION send(queue_name text, msg jsonb, delay timestamp with time zone); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, delay timestamp with time zone) TO service_role;


--
-- Name: FUNCTION send(queue_name text, msg jsonb, headers jsonb, delay integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, headers jsonb, delay integer) TO service_role;


--
-- Name: FUNCTION send(queue_name text, msg jsonb, headers jsonb, delay timestamp with time zone); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send(queue_name text, msg jsonb, headers jsonb, delay timestamp with time zone) TO service_role;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[]); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[]) TO service_role;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[], headers jsonb[]); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], headers jsonb[]) TO service_role;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[], delay integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], delay integer) TO service_role;
GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], delay integer) TO anon;
GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], delay integer) TO authenticated;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[], delay timestamp with time zone); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], delay timestamp with time zone) TO service_role;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[], headers jsonb[], delay integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], headers jsonb[], delay integer) TO service_role;


--
-- Name: FUNCTION send_batch(queue_name text, msgs jsonb[], headers jsonb[], delay timestamp with time zone); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.send_batch(queue_name text, msgs jsonb[], headers jsonb[], delay timestamp with time zone) TO service_role;


--
-- Name: FUNCTION set_vt(queue_name text, msg_id bigint, vt integer); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.set_vt(queue_name text, msg_id bigint, vt integer) TO service_role;


--
-- Name: FUNCTION validate_queue_name(queue_name text); Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq.validate_queue_name(queue_name text) TO service_role;


--
-- Name: FUNCTION archive(queue_name text, message_id bigint); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.archive(queue_name text, message_id bigint) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.archive(queue_name text, message_id bigint) TO anon;
GRANT ALL ON FUNCTION pgmq_public.archive(queue_name text, message_id bigint) TO authenticated;


--
-- Name: FUNCTION delete(queue_name text, message_id bigint); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.delete(queue_name text, message_id bigint) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.delete(queue_name text, message_id bigint) TO anon;
GRANT ALL ON FUNCTION pgmq_public.delete(queue_name text, message_id bigint) TO authenticated;


--
-- Name: FUNCTION pop(queue_name text); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.pop(queue_name text) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.pop(queue_name text) TO anon;
GRANT ALL ON FUNCTION pgmq_public.pop(queue_name text) TO authenticated;


--
-- Name: FUNCTION read(queue_name text, sleep_seconds integer, n integer); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) TO anon;
GRANT ALL ON FUNCTION pgmq_public.read(queue_name text, sleep_seconds integer, n integer) TO authenticated;


--
-- Name: FUNCTION send(queue_name text, message jsonb, sleep_seconds integer); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) TO anon;
GRANT ALL ON FUNCTION pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) TO authenticated;


--
-- Name: FUNCTION send_batch(queue_name text, messages jsonb[], sleep_seconds integer); Type: ACL; Schema: pgmq_public; Owner: postgres
--

GRANT ALL ON FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) TO service_role;
GRANT ALL ON FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) TO anon;
GRANT ALL ON FUNCTION pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) TO authenticated;


--
-- Name: FUNCTION get_funnel_column_stats(p_funnel_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_funnel_column_stats(p_funnel_id uuid) TO authenticated;


--
-- Name: FUNCTION get_funnel_stats(p_funnel_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_funnel_stats(p_funnel_id uuid) TO authenticated;


--
-- Name: FUNCTION get_serpdev_api_key(key_index integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_serpdev_api_key(key_index integer) TO service_role;


--
-- Name: FUNCTION pgmq_delete_msg(queue_name text, msg_id bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgmq_delete_msg(queue_name text, msg_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.pgmq_delete_msg(queue_name text, msg_id bigint) TO service_role;
GRANT ALL ON FUNCTION public.pgmq_delete_msg(queue_name text, msg_id bigint) TO anon;


--
-- Name: FUNCTION pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer) TO authenticated;
GRANT ALL ON FUNCTION public.pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer) TO service_role;
GRANT ALL ON FUNCTION public.pgmq_read_batch(queue_name text, visibility_timeout integer, qty integer) TO anon;


--
-- Name: FUNCTION pgmq_send(queue_name text, message jsonb, delay_seconds integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgmq_send(queue_name text, message jsonb, delay_seconds integer) TO service_role;
GRANT ALL ON FUNCTION public.pgmq_send(queue_name text, message jsonb, delay_seconds integer) TO authenticated;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT SELECT ON TABLE cron.job TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job_run_details; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON TABLE cron.job_run_details TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE a_enrichment_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_enrichment_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.a_enrichment_queue TO service_role;


--
-- Name: TABLE a_google_maps_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_google_maps_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.a_google_maps_queue TO service_role;


--
-- Name: TABLE a_scraping_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_scraping_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.a_scraping_queue TO service_role;


--
-- Name: TABLE meta; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON TABLE pgmq.meta TO service_role;


--
-- Name: TABLE q_enrichment_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_enrichment_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.q_enrichment_queue TO service_role;


--
-- Name: SEQUENCE q_enrichment_queue_msg_id_seq; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON SEQUENCE pgmq.q_enrichment_queue_msg_id_seq TO anon;
GRANT ALL ON SEQUENCE pgmq.q_enrichment_queue_msg_id_seq TO authenticated;
GRANT ALL ON SEQUENCE pgmq.q_enrichment_queue_msg_id_seq TO service_role;


--
-- Name: TABLE q_google_maps_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_google_maps_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.q_google_maps_queue TO service_role;


--
-- Name: SEQUENCE q_google_maps_queue_msg_id_seq; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON SEQUENCE pgmq.q_google_maps_queue_msg_id_seq TO anon;
GRANT ALL ON SEQUENCE pgmq.q_google_maps_queue_msg_id_seq TO authenticated;
GRANT ALL ON SEQUENCE pgmq.q_google_maps_queue_msg_id_seq TO service_role;


--
-- Name: TABLE q_scraping_queue; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_scraping_queue TO pg_monitor;
GRANT ALL ON TABLE pgmq.q_scraping_queue TO service_role;


--
-- Name: SEQUENCE q_scraping_queue_msg_id_seq; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT ALL ON SEQUENCE pgmq.q_scraping_queue_msg_id_seq TO anon;
GRANT ALL ON SEQUENCE pgmq.q_scraping_queue_msg_id_seq TO authenticated;
GRANT ALL ON SEQUENCE pgmq.q_scraping_queue_msg_id_seq TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO authenticated;


--
-- Name: SEQUENCE audit_log_sequence_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_log_sequence_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.audit_log_sequence_seq TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE custom_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.custom_fields TO authenticated;
GRANT ALL ON TABLE public.custom_fields TO service_role;


--
-- Name: TABLE extraction_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.extraction_logs TO service_role;
GRANT SELECT ON TABLE public.extraction_logs TO authenticated;


--
-- Name: TABLE funnel_columns; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.funnel_columns TO authenticated;


--
-- Name: TABLE funnels; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.funnels TO authenticated;


--
-- Name: TABLE inbox_instances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inbox_instances TO anon;
GRANT ALL ON TABLE public.inbox_instances TO authenticated;
GRANT ALL ON TABLE public.inbox_instances TO service_role;


--
-- Name: TABLE inboxes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inboxes TO anon;
GRANT ALL ON TABLE public.inboxes TO authenticated;
GRANT ALL ON TABLE public.inboxes TO service_role;


--
-- Name: TABLE instances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.instances TO anon;
GRANT ALL ON TABLE public.instances TO authenticated;
GRANT ALL ON TABLE public.instances TO service_role;


--
-- Name: TABLE lead_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_activities TO authenticated;


--
-- Name: TABLE lead_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_attachments TO authenticated;


--
-- Name: TABLE lead_custom_values; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_custom_values TO authenticated;


--
-- Name: TABLE lead_extraction_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lead_extraction_runs TO authenticated;
GRANT ALL ON TABLE public.lead_extraction_runs TO service_role;


--
-- Name: TABLE lead_extractions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lead_extractions TO authenticated;
GRANT ALL ON TABLE public.lead_extractions TO service_role;


--
-- Name: TABLE lead_extraction_recent_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.lead_extraction_recent_runs TO authenticated;


--
-- Name: TABLE lead_extraction_staging; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_extraction_staging TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lead_extraction_staging TO authenticated;


--
-- Name: TABLE lead_extractions_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.lead_extractions_stats TO authenticated;


--
-- Name: TABLE leads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leads TO authenticated;
GRANT ALL ON TABLE public.leads TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO authenticated;


--
-- Name: TABLE workspace_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workspace_invites TO authenticated;


--
-- Name: TABLE workspace_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workspace_members TO authenticated;


--
-- Name: TABLE workspaces; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workspaces TO authenticated;
GRANT ALL ON TABLE public.workspaces TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2025_11_21; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_21 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_21 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_22; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_22 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_22 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_23; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_23 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_23 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_24; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_24 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_24 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_25; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_25 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_25 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_26; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_26 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_26 TO dashboard_user;


--
-- Name: TABLE messages_2025_11_27; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2025_11_27 TO postgres;
GRANT ALL ON TABLE realtime.messages_2025_11_27 TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE vault.secrets TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE vault.decrypted_secrets TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON SEQUENCES TO pg_monitor;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON TABLES TO pg_monitor;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict QxvJhhy7cdim7oSejJkSv582FGCaUypG1k72wxe1bR2Dhs5b19sarjRhibxGNmS


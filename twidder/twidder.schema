drop table if exists user;
create table user (
  id integer primary key autoincrement,
  email text not null,
  password text not null,
  firstname text not null,
  familyname text not null,
  gender text not null,
  city text not null,
  country text not null
);

insert into user (email, password, firstname, familyname, gender, city, country) values
  ('spohie@test.com', 'test1234', 'sophie', 'whatever', 'female', 'vienna', 'austria');
insert into user (email, password, firstname, familyname, gender, city, country) values
  ('foo@bar.com', 'test1234', 'foo', 'bar', 'male', 'vienna', 'austria');

drop table if exists wall;
create table wall (
  id integer primary key autoincrement,
  from_email text not null,
  to_email text not null,
  message text not null
);

insert into wall (from_email, to_email, message) values ('spohie@test.com', 'spohie@test.com', 'from sophie to sophie');
insert into wall (from_email, to_email, message) values ('spohie@test.com', 'foo@bar.com', 'from sophie to foo');
insert into wall (from_email, to_email, message) values ('foo@bar.com', 'spohie@test.com', 'from foo to sophie');
